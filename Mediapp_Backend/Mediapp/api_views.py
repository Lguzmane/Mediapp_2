# Mediapp/api_views.py
from datetime import datetime
from django.shortcuts import get_object_or_404
import urllib3
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Medico, Especialidad, Cita, AgendaMedica, BloqueoAgenda
from .serializers import MedicoSerializer, CitaSerializer

import requests

# Desactivar advertencias SSL para desarrollo
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# =========================
#        CITAS API
# =========================
class CitaViewSet(viewsets.ModelViewSet):
    """
    - GET    /api/citas/?paciente_id=&medico_id=
    - POST   /api/citas/
    - PUT    /api/citas/<id>/cancelar/
    """
    serializer_class = CitaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'head', 'options']

    def get_queryset(self):
        qs = Cita.objects.select_related('paciente', 'medico__usuario', 'especialidad')
        user = self.request.user

        # Alcance por rol
        if getattr(user, 'tipo_usuario', None) == 'paciente':
            qs = qs.filter(paciente=user)
        elif getattr(user, 'tipo_usuario', None) == 'medico':
            medico = Medico.objects.filter(usuario=user).first()
            qs = qs.filter(medico=medico) if medico else qs.none()

        # Filtros explícitos
        paciente_id = self.request.query_params.get('paciente_id')
        medico_id = self.request.query_params.get('medico_id')
        if paciente_id:
            qs = qs.filter(paciente_id=paciente_id)
        if medico_id:
            qs = qs.filter(medico_id=medico_id)

        return qs.order_by('-fecha', '-hora')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Inyectar paciente si quien crea es paciente
        extra = {}
        if getattr(request.user, 'tipo_usuario', None) == 'paciente':
            extra['paciente'] = request.user
        else:
            if not serializer.validated_data.get('paciente'):
                return Response({'detail': 'paciente_id es requerido si no eres paciente.'},
                                status=status.HTTP_400_BAD_REQUEST)

        cita = Cita.objects.create(
            paciente=extra.get('paciente') or serializer.validated_data['paciente'],
            medico=serializer.validated_data['medico'],
            especialidad=serializer.validated_data['especialidad'],
            fecha=serializer.validated_data['fecha'],
            hora=serializer.validated_data['hora'],
            estado='agendada'
        )
        out = self.get_serializer(cita)
        headers = self.get_success_headers(out.data)
        return Response(out.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['put'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        cita = get_object_or_404(Cita, pk=pk)
        user = request.user

        # Autorización por rol
        if getattr(user, 'tipo_usuario', None) == 'paciente':
            if cita.paciente_id != user.id:
                return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
        elif getattr(user, 'tipo_usuario', None) == 'medico':
            medico = Medico.objects.filter(usuario=user).first()
            if not medico or cita.medico_id != medico.id:
                return Response({'detail': 'No autorizado para esta cita'}, status=status.HTTP_403_FORBIDDEN)
        # admin u otros: permitido

        motivo = request.data.get('motivo', '')
        cita.estado = 'cancelada'
        if motivo:
            cita.motivo_cancelacion = motivo
            cita.save(update_fields=['estado', 'motivo_cancelacion'])
        else:
            cita.save(update_fields=['estado'])

        return Response(self.get_serializer(cita).data, status=status.HTTP_200_OK)


# =========================
#       MÉDICOS API
# =========================
class MedicoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    - GET /api/medicos/?especialidad_id=  o  ?especialidad=texto
    - GET /api/medicos/<id>/
    - (opcional) ?con_disponibilidad=1 para anexar agendas/bloqueos/citas
    """
    serializer_class = MedicoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Medico.objects.select_related('usuario', 'especialidad')
        esp_id = self.request.query_params.get('especialidad_id')
        esp_txt = self.request.query_params.get('especialidad')
        if esp_id:
            qs = qs.filter(especialidad_id=esp_id)
        if esp_txt:
            qs = qs.filter(especialidad__nombre__icontains=esp_txt)
        return qs.order_by('usuario__first_name')

    def retrieve(self, request, *args, **kwargs):
        resp = super().retrieve(request, *args, **kwargs)
        if request.query_params.get('con_disponibilidad') == '1':
            medico = self.get_object()
            agendas = list(AgendaMedica.objects.filter(medico=medico).values())
            bloqueos = list(BloqueoAgenda.objects.filter(medico=medico).values())
            citas = list(Cita.objects.filter(medico=medico).values('fecha', 'hora', 'estado'))
            resp.data['disponibilidad'] = {
                'agendas': agendas,
                'bloqueos': bloqueos,
                'citas': citas,
            }
        return resp


# =========================
#     PROXYS EXTERNOS
# =========================

# --- ICD-10 Autocomplete (NLM ICD-10-CM, robusto) ---
class ICDSearchView(APIView):
    """
    GET /api/icd/search/?q=<texto>
    Respuesta: {"results":[{"code":"...","title":"..."}], "source":"NLM"}
    """
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({"detail": "Parámetro q es requerido."}, status=400)
        try:
            r = requests.get(
                "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search",
                params={"terms": q, "sf": "code,name", "maxList": 25},
                timeout=10,
                verify=False,  # DEV: evita problemas SSL locales
            )
            r.raise_for_status()
            data = r.json()  # forma: [version, ..., ..., rows]
            rows = data[3] if isinstance(data, list) and len(data) >= 4 and isinstance(data[3], list) else []
            results = []
            for row in rows:
                # row esperado: ["CODE", "Name", ...]
                if isinstance(row, list) and row:
                    code = row[0]
                    title = row[1] if len(row) > 1 else ""
                    results.append({"code": code, "title": title})
            return Response({"results": results, "source": "NLM"})
        except requests.exceptions.RequestException as e:
            return Response({"detail": "Error ICD (NLM)", "error": str(e)}, status=502)


class FeriadosChileView(APIView):
    def get(self, request, year: int):
        # 1) Principal: Nager (estable)
        try:
            r = requests.get(f"https://date.nager.at/api/v3/publicholidays/{year}/CL", timeout=8)
            r.raise_for_status()
            data = r.json()  # [{date:'YYYY-MM-DD', localName:'…', name:'…'}, ...]
            out = [{"fecha": i.get("date"), "nombre": i.get("localName") or i.get("name")} for i in (data or [])]
            return Response(out)
        except requests.RequestException:
            pass

        # 2) Fallback: API Gobierno (a veces da problemas en dev)
        try:
            r2 = requests.get(f"https://apis.digital.gob.cl/fl/feriados/{year}", timeout=8, verify=False)
            r2.raise_for_status()
            data2 = r2.json()  # [{fecha:'YYYY-MM-DD', nombre:'…'}, ...]
            out2 = [{"fecha": i.get("fecha"), "nombre": i.get("nombre")} for i in (data2 or [])]
            return Response(out2)
        except requests.RequestException as e2:
            return Response(
                {"detail": "Error al consultar Feriados Chile", "error": str(e2)},
                status=502
            )