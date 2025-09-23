from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET, require_POST
from django.contrib import messages
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import get_user_model
from django.shortcuts import render
from django.core.serializers.json import DjangoJSONEncoder
import json
from django.contrib.auth import logout
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import Usuario, Cita
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Usuario, Medico, Cita, AgendaMedica, BloqueoAgenda, Especialidad
from django.contrib.auth import authenticate, login
from datetime import datetime, time, timedelta
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET

# Vista login con respuesta JSON si viene desde JS
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        usuario = authenticate(request, username=email, password=password)

        if usuario is not None:
            login(request, usuario)

            if usuario.tipo_usuario == 'paciente':
                return redirect('perfil_paciente')
            elif usuario.tipo_usuario == 'medico':
                return redirect('agenda_medico')
            elif usuario.tipo_usuario == 'admin':
                return redirect('dashboard_admin')
            else:
                return redirect('index')  # fallback

        else:
            messages.error(request, 'Credenciales inválidas')

    return render(request, 'Mediapp/registration/login.html')


# Vista de registro HTML (formulario tradicional)
# Vista de registro HTML (formulario tradicional)
def registro_view(request):
    if request.method == 'POST':
        rut = request.POST.get('rut')
        nombre = request.POST.get('nombre')
        email = request.POST.get('email')
        password = request.POST.get('password')
        tipo_usuario = request.POST.get('tipoUsuario')
        # OJO: este campo del form puede venir como ID o como nombre
        especialidad_raw = request.POST.get('especialidad')
        codigo_admin = request.POST.get('codigoAdmin')

        if Usuario.objects.filter(email=email).exists():
            messages.error(request, 'Este email ya está registrado')
            return redirect('registro')

        nuevo_usuario = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            rut=rut,
            first_name=nombre,
            tipo_usuario=tipo_usuario
        )

        if tipo_usuario == 'medico':
            # Resolver especialidad ya sea por ID (número) o por nombre (string)
            esp = None
            if especialidad_raw:
                try:
                    esp_id = int(especialidad_raw)
                    esp = Especialidad.objects.filter(id=esp_id).first()
                except (ValueError, TypeError):
                    esp = Especialidad.objects.filter(nombre=especialidad_raw).first()

            Medico.objects.create(usuario=nuevo_usuario, especialidad=esp)

        if tipo_usuario == 'admin':
            if codigo_admin != 'ADMIN123':
                nuevo_usuario.delete()
                messages.error(request, 'Código de administrador incorrecto')
                return redirect('registro')
            nuevo_usuario.is_staff = True
            nuevo_usuario.is_superuser = True
            nuevo_usuario.save()

        messages.success(request, '¡Registro exitoso! Ahora puedes iniciar sesión.')
        return redirect('login')

    return render(request, 'Mediapp/registration/registro.html')


# Vista de registro API (respuesta JSON)
@csrf_exempt
@require_POST
def registro_api(request):
    try:
        rut = request.POST.get('rut')
        nombre = request.POST.get('nombre')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm = request.POST.get('confirmPassword')
        tipo = request.POST.get('tipoUsuario')
        especialidad_nombre = request.POST.get('especialidad')
        codigo_admin = request.POST.get('codigoAdmin')

        if Usuario.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'Este email ya está registrado'}, status=400)

        if Usuario.objects.filter(rut=rut).exists():
            return JsonResponse({'success': False, 'message': 'Este RUT ya está registrado'}, status=400)

        if password != confirm:
            return JsonResponse({'success': False, 'message': 'Las contraseñas no coinciden'}, status=400)

        user = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            rut=rut,
            first_name=nombre,
            tipo_usuario=tipo
        )

        if tipo == 'medico':
            especialidad = Especialidad.objects.filter(nombre=especialidad_nombre).first()
            Medico.objects.create(usuario=user, especialidad=especialidad)

        if tipo == 'admin':
            if codigo_admin != 'ADMIN123':
                user.delete()
                return JsonResponse({'success': False, 'message': 'Código de administrador incorrecto'}, status=400)
            user.is_staff = True
            user.is_superuser = True
            user.save()

        return JsonResponse({'success': True, 'tipo_usuario': tipo})

    except IntegrityError as e:
        return JsonResponse({'success': False, 'message': 'Error de integridad: ' + str(e)}, status=400)

    except Exception as e:
        return JsonResponse({'success': False, 'message': 'Error inesperado: ' + str(e)}, status=500)

# Vista Médico (Agenda + Bloqueos)
@login_required
def agenda_medico(request):
    if request.user.tipo_usuario != 'medico':
        return redirect('login')

    medico = Medico.objects.get(usuario=request.user)
    context = {
        'agenda': AgendaMedica.objects.filter(medico=medico),
        'bloqueos': BloqueoAgenda.objects.filter(medico=medico),
        'citas': Cita.objects.filter(medico=medico)
    }
    return render(request, 'Mediapp/medico/agenda.html', context)

# Vista Paciente
@login_required
def perfil_paciente(request):
    if request.user.tipo_usuario != 'paciente':
        return redirect('login')

    user = request.user
    context = {
        'paciente': {
        'nombre': user.get_full_name(),
        'fechaNacimiento': user.fecha_nacimiento.strftime('%Y-%m-%d') if user.fecha_nacimiento else '',
        'genero': user.genero if hasattr(user, 'genero') else '',
        'documento': user.rut,
        'nacionalidad': user.nacionalidad if hasattr(user, 'nacionalidad') else '',
        'telefono': user.telefono,
        'email': user.email,
        'direccion': user.direccion,
        'grupoSanguineo': user.grupo_sanguineo if hasattr(user, 'grupo_sanguineo') else '',
        'alergias': user.alergias if hasattr(user, 'alergias') else '',
        'condiciones': user.condiciones_medicas if hasattr(user, 'condiciones_medicas') else '',
        'medicamentos': user.medicamentos if hasattr(user, 'medicamentos') else '',
        'cirugias': user.cirugias_previas if hasattr(user, 'cirugias_previas') else ''
        }
    }
    return render(request, 'Mediapp/paciente/perfil.html', context)




@login_required
def actualizar_perfil_paciente(request):
    if request.method == "POST" and request.user.tipo_usuario == 'paciente':
        try:
            data = json.loads(request.body)
            user = request.user

            user.first_name = data.get("nombre", "").split(" ")[0]
            user.last_name = " ".join(data.get("nombre", "").split(" ")[1:])
            user.fecha_nacimiento = data.get("fechaNacimiento") or None
            user.genero = data.get("genero")
            user.rut = data.get("documento")
            user.nacionalidad = data.get("nacionalidad")
            user.telefono = data.get("telefono")
            user.email = data.get("email")
            user.direccion = data.get("direccion")
            user.grupo_sanguineo = data.get("grupoSanguineo")
            user.alergias = data.get("alergias")
            user.condiciones_medicas = data.get("condiciones")
            user.medicamentos = data.get("medicamentos")
            user.cirugias_previas = data.get("cirugias")

            user.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    return JsonResponse({"success": False, "message": "Método no permitido"})


@login_required
def reservas_paciente(request):
    if request.user.tipo_usuario != 'paciente':
        return redirect('login')

    user = request.user
    context = {
        'paciente': {
            'nombre': user.get_full_name(),  # Combina first_name y last_name
            'fecha_nacimiento': user.fecha_nacimiento.strftime('%Y-%m-%d') if user.fecha_nacimiento else '',
            'genero': user.genero if hasattr(user, 'genero') else '',
            'documento': user.rut,
            'nacionalidad': user.nacionalidad if hasattr(user, 'nacionalidad') else '',
            'telefono': user.telefono,
            'email': user.email,
            'direccion': user.direccion,
            'grupo_sanguineo': user.grupo_sanguineo if hasattr(user, 'grupo_sanguineo') else '',
            'alergias': user.alergias if hasattr(user, 'alergias') else '',
            'condiciones': user.condiciones_medicas if hasattr(user, 'condiciones_medicas') else '',
            'medicamentos': user.medicamentos if hasattr(user, 'medicamentos') else '',
            'cirugias': user.cirugias_previas if hasattr(user, 'cirugias_previas') else ''
        }
    }
    return render(request, 'Mediapp/paciente/reservas.html', context)

@login_required
def citas_paciente(request):
    if request.user.tipo_usuario != 'paciente':
        return redirect('login')
    context = {
        'citas': Cita.objects.filter(paciente=request.user)
    }
    return render(request, 'Mediapp/paciente/citas.html', context)

# Vista Admin
@login_required
def dashboard_admin(request):
    if not request.user.is_superuser:
        return redirect('login')
    return render(request, 'Mediapp/admin/dashboard.html')

# Vista Principal
def index(request):
    return render(request, 'Mediapp/index.html')

# Verifica sesión (usado por JS)
def check_session(request):
    user = request.user
    if user.is_authenticated:
        return JsonResponse({'is_authenticated': True, 'nombre': user.first_name})
    return JsonResponse({'is_authenticated': False, 'nombre': None})

# Renderiza componentes dinámicos
def component_view(request, template_name):
    allowed_templates = ['header', 'footer']  # Seguridad: lista blanca
    if template_name not in allowed_templates:
        raise Http404("Componente no encontrado")
    return render(request, f'Mediapp/components/{template_name}.html')

# Vista para recuperación de contraseña
def recuperar_view(request):
    if 'email' not in request.GET:
        if request.method == 'POST':
            form = PasswordResetForm(request.POST)
            if form.is_valid():
                form.save(
                    request=request,
                    use_https=request.is_secure(),
                    email_template_name='Mediapp/registration/password_reset_email.html',
                )
                messages.success(request, "Se ha enviado un enlace a tu correo.")
                return redirect('password_reset')
        else:
            form = PasswordResetForm()
        return render(request, 'Mediapp/registration/recuperar.html', {'form': form})
    else:
        uidb64 = request.GET.get('uid')
        token = request.GET.get('token')
        UserModel = get_user_model()

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = UserModel.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
            user = None

        if user and default_token_generator.check_token(user, token):
            if request.method == 'POST':
                form = SetPasswordForm(user, request.POST)
                if form.is_valid():
                    form.save()
                    messages.success(request, "¡Contraseña restablecida con éxito!")
                    return redirect('login')
            else:
                form = SetPasswordForm(user)
            return render(request, 'Mediapp/registration/recuperar.html', {'form': form})
        else:
            messages.error(request, "El enlace no es válido o ha expirado.")
            return redirect('password_reset')

@login_required
@require_GET
def api_obtener_citas(request):
    if request.user.tipo_usuario != 'paciente':
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    citas = Cita.objects.filter(paciente=request.user).order_by('-fecha', '-hora')
    data = []
    for cita in citas:
        data.append({
            'id': cita.id,
            'medicoNombre': f"{cita.medico.usuario.first_name} {cita.medico.usuario.last_name}",
            'especialidadNombre': cita.especialidad.nombre if cita.especialidad else '',
            'fecha': cita.fecha.strftime('%Y-%m-%d'),
            'hora': cita.hora.strftime('%H:%M'),
            'estado': cita.estado
        })
    return JsonResponse(data, safe=False)

@login_required
@require_POST
def api_reservar_cita(request):
    if request.user.tipo_usuario != 'paciente':
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'success': False, 'message': 'JSON inválido'}, status=400)

    medico_id = data.get('medico_id')
    especialidad_id = data.get('especialidad_id')   # preferido
    especialidad_nombre = data.get('especialidad')  # compat si aún envías nombre
    fecha = data.get('fecha')  # YYYY-MM-DD
    hora = data.get('hora')    # HH:MM

    if not all([medico_id, (especialidad_id or especialidad_nombre), fecha, hora]):
        return JsonResponse({'success': False, 'message': 'Faltan datos obligatorios'}, status=400)

    # Parse seguro
    try:
        fecha_obj = datetime.fromisoformat(fecha).date()
        hora_obj = datetime.strptime(hora, "%H:%M").time()
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Formato fecha/hora inválido'}, status=400)

    # Entidades
    try:
        medico = Medico.objects.get(id=medico_id)
    except Medico.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Médico no encontrado'}, status=404)

    especialidad = None
    if especialidad_id:
        especialidad = Especialidad.objects.filter(id=especialidad_id).first()
    elif especialidad_nombre:
        especialidad = Especialidad.objects.filter(nombre=especialidad_nombre).first()
    if not especialidad:
        return JsonResponse({'success': False, 'message': 'Especialidad no encontrada'}, status=404)

    # Consistencia con la especialidad del médico (si la tiene)
    if medico.especialidad_id and especialidad.id != medico.especialidad_id:
        return JsonResponse({'success': False, 'message': 'La especialidad no coincide con la del médico'}, status=400)

    # Colisión (mismo médico, fecha, hora)
    existe = Cita.objects.filter(medico=medico, fecha=fecha_obj, hora=hora_obj, estado='agendada').exists()
    if existe:
        return JsonResponse({'success': False, 'message': 'Ese horario ya está tomado'}, status=409)

    # Crear
    cita = Cita.objects.create(
        paciente=request.user,
        medico=medico,
        especialidad=especialidad,
        fecha=fecha_obj,
        hora=hora_obj,
        estado='agendada'
    )
    return JsonResponse({'success': True, 'cita_id': cita.id})


@login_required
@require_POST
def api_cancelar_cita(request):
    if request.user.tipo_usuario != 'paciente':
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    try:
        data = json.loads(request.body)
        cita_id = data.get('cita_id')

        if not cita_id:
            return JsonResponse({'success': False, 'message': 'ID de cita requerido'}, status=400)

        cita = Cita.objects.get(id=cita_id, paciente=request.user)
        cita.estado = 'cancelada'
        cita.save()

        return JsonResponse({'success': True})
    except Cita.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Cita no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_POST
def cancelar_cita_medico(request, cita_id):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    try:
        cita = Cita.objects.get(id=cita_id)

        # Verifica que la cita sea del médico actual
        medico = Medico.objects.get(usuario=request.user)
        if cita.medico != medico:
            return JsonResponse({'success': False, 'message': 'No autorizado para esta cita'}, status=403)

        cita.estado = 'cancelada'
        cita.save()
        return JsonResponse({'success': True, 'message': 'Cita cancelada exitosamente'})
    except Cita.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Cita no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_GET
def api_admin_usuarios(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    tipo = request.GET.get('tipo')  # paciente / medico / admin (opcional)

    if tipo:
        usuarios = Usuario.objects.filter(tipo_usuario=tipo)
    else:
        usuarios = Usuario.objects.all()

    data = []
    for user in usuarios:
        data.append({
            'id': user.id,
            'nombre': user.get_full_name(),
            'email': user.email,
            'tipo': user.tipo_usuario,
            'rut': user.rut,
            'telefono': user.telefono,
            'direccion': user.direccion,
        })
    return JsonResponse(data, safe=False)

@login_required
@require_GET
def api_admin_citas(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    citas = Cita.objects.select_related('paciente', 'medico', 'especialidad').all().order_by('-fecha', '-hora')

    data = []
    for c in citas:
        data.append({
            'id': c.id,
            'paciente': f"{c.paciente.first_name} {c.paciente.last_name}",
            'medico': f"{c.medico.usuario.first_name} {c.medico.usuario.last_name}",
            'especialidad': c.especialidad.nombre if c.especialidad else '',
            'fecha': c.fecha.strftime('%Y-%m-%d'),
            'hora': c.hora.strftime('%H:%M'),
            'estado': c.estado
        })
    return JsonResponse(data, safe=False)

from django.db.models import Count

@login_required
@require_GET
def api_admin_estadisticas(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    total_usuarios = Usuario.objects.count()
    total_pacientes = Usuario.objects.filter(tipo_usuario='paciente').count()
    total_medicos = Usuario.objects.filter(tipo_usuario='medico').count()
    total_citas = Cita.objects.count()
    citas_confirmadas = Cita.objects.filter(estado='agendada').count()
    citas_canceladas = Cita.objects.filter(estado='cancelada').count()

    citas_por_especialidad = (
        Cita.objects.values('especialidad__nombre')
        .annotate(total=Count('id'))
        .order_by('-total')
    )

    return JsonResponse({
        'usuarios': total_usuarios,
        'pacientes': total_pacientes,
        'medicos': total_medicos,
        'citas_total': total_citas,
        'citas_confirmadas': citas_confirmadas,
        'citas_canceladas': citas_canceladas,
        'citas_por_especialidad': list(citas_por_especialidad)
    })

@login_required
def logout_view(request):
    logout(request)
    return redirect('index')

from django.http import JsonResponse
from .models import Usuario

def api_buscar_usuario(request):
    if request.method == 'GET':
        rut = request.GET.get('rut')
        if rut:
            try:
                usuario = Usuario.objects.get(rut=rut)
                return JsonResponse({
                    'nombre': usuario.first_name,
                    'email': usuario.email,
                    'tipo_usuario': usuario.tipo_usuario
                })
            except Usuario.DoesNotExist:
                return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
        return JsonResponse({'error': 'Parámetro rut requerido'}, status=400)
    return JsonResponse({'error': 'Método no permitido'}, status=405)

# Vista para generar informe de usuarios
@login_required
@require_GET
def api_generar_informe(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    total_usuarios = Usuario.objects.count()
    usuarios_por_tipo = Usuario.objects.values('tipo_usuario').annotate(total=Count('id'))

    data = {
        'total_usuarios': total_usuarios,
        'usuarios_por_tipo': list(usuarios_por_tipo),
    }
    return JsonResponse({'success': True, 'data': data})

# Vista para obtener resumen de citas para dashboard
@login_required
@require_GET
def api_citas_dashboard(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    total_citas = Cita.objects.count()
    citas_agendadas = Cita.objects.filter(estado='agendada').count()
    citas_canceladas = Cita.objects.filter(estado='cancelada').count()
    citas_completadas = Cita.objects.filter(estado='completada').count()

    data = {
        'total_citas': total_citas,
        'agendadas': citas_agendadas,
        'canceladas': citas_canceladas,
        'completadas': citas_completadas
    }
    return JsonResponse({'success': True, 'data': data})

# Vista para obtener resumen de registros (usuarios)
@login_required
@require_GET
def api_registros_dashboard(request):
    if not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    registros = Usuario.objects.values('fecha_joined', 'tipo_usuario').annotate(total=Count('id')).order_by('-fecha_joined')[:10]

    return JsonResponse({'success': True, 'data': list(registros)})

def ver_usuario_admin(request):
    if request.method == 'GET':
        return JsonResponse({"mensaje": "Vista en construcción: ver_usuario_admin"}, status=200)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

@csrf_exempt
def editar_usuario_admin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            return JsonResponse({"mensaje": "Vista en construcción: editar_usuario_admin", "datos_recibidos": data}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

#------------------------------
#------------------------------
# === HELPER DE RANGO DE HORAS ===
def _time_range(start: time, end: time, step_minutes: int):
    cur = datetime.combine(datetime.today(), start)
    end_dt = datetime.combine(datetime.today(), end)
    while cur < end_dt:
        yield cur.time().strftime("%H:%M")
        cur += timedelta(minutes=step_minutes)

# === NUEVO: LISTAR ESPECIALIDADES ===
@login_required
@require_GET
def api_especialidades(request):
    data = list(Especialidad.objects.values('id', 'nombre').order_by('nombre'))
    return JsonResponse(data, safe=False)

# === NUEVO: LISTAR MÉDICOS POR ESPECIALIDAD (opcional) ===
@login_required
@require_GET
def api_medicos(request):
    esp_id = request.GET.get('especialidad_id')
    qs = Medico.objects.select_related('usuario')
    if esp_id:
        qs = qs.filter(especialidad_id=esp_id)
    data = [{
        'id': m.id,
        'nombre': f"{m.usuario.first_name} {m.usuario.last_name}".strip() or m.usuario.email
    } for m in qs]
    return JsonResponse(data, safe=False)

# === NUEVO: DISPONIBILIDAD REAL POR DÍA ===
@login_required
@require_GET
def api_disponibilidad(request):
    medico_id = request.GET.get('medico_id')
    fecha_str = request.GET.get('fecha')  # YYYY-MM-DD
    if not (medico_id and fecha_str):
        return JsonResponse({'success': False, 'message': 'medico_id y fecha son obligatorios'}, status=400)

    try:
        fecha = datetime.fromisoformat(fecha_str).date()
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Fecha inválida (YYYY-MM-DD)'}, status=400)

    try:
        medico = Medico.objects.get(id=medico_id)
    except Medico.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Médico no encontrado'}, status=404)

    dia_semana_map = {0:'lunes',1:'martes',2:'miércoles',3:'jueves',4:'viernes',5:'sábado',6:'domingo'}
    dia_nombre = dia_semana_map[fecha.weekday()]

    # 1) Agenda base del día
    agenda = AgendaMedica.objects.filter(medico=medico, dia_semana=dia_nombre).first()
    if not agenda:
        return JsonResponse([], safe=False)

    # 2) Generar slots por duración
    slots = list(_time_range(agenda.hora_inicio, agenda.hora_fin, agenda.duracion_cita))

    # 3) Bloqueos intersectantes con ese día
    bloques = BloqueoAgenda.objects.filter(
        medico=medico,
        fecha_inicio__date__lte=fecha,
        fecha_fin__date__gte=fecha
    )
    def _is_blocked(slot_hhmm: str) -> bool:
        h, m = map(int, slot_hhmm.split(':'))
        slot_dt = datetime.combine(fecha, time(h, m))
        for b in bloques:
            if b.fecha_inicio <= slot_dt < b.fecha_fin:
                return True
        return False

    # 4) Citas ya tomadas
    citas = Cita.objects.filter(medico=medico, fecha=fecha, estado='agendada').values_list('hora', flat=True)
    citas_taken = {t.strftime("%H:%M") for t in citas}

    libres = [s for s in slots if (s not in citas_taken) and (not _is_blocked(s))]
    return JsonResponse(libres, safe=False)

# =============================================
# API DEL MÉDICO (usada por medico.js)
# =============================================
from django.utils.dateparse import parse_datetime

def _as_dt(s):
    if not s:
        return None
    s = s.replace('Z', '+00:00')
    return parse_datetime(s)

@login_required
@require_POST
def api_medico_citas(request):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False, 'message': 'No autorizado'}, status=403)

    data = json.loads(request.body or '{}')
    ini = _as_dt(data.get('inicio'))
    fin = _as_dt(data.get('fin'))
    if not ini or not fin:
        return JsonResponse({'success': False, 'message': 'Rango inválido'}, status=400)

    medico = Medico.objects.get(usuario=request.user)
    citas = Cita.objects.filter(medico=medico, fecha__range=[ini.date(), fin.date()]).select_related('paciente')

    out = []
    for c in citas:
        fh = datetime.combine(c.fecha, c.hora)
        out.append({
            'id': c.id,
            'paciente_id': c.paciente.id,
            'paciente_nombre': c.paciente.get_full_name() or c.paciente.email,
            'fecha_hora': fh.isoformat(),
            'motivo': '',
            'notas': '',
            'estado': c.estado,
        })
    return JsonResponse(out, safe=False)

@login_required
@require_GET
def api_medico_bloqueos(request):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False}, status=403)

    ini = _as_dt(request.GET.get('inicio'))
    fin = _as_dt(request.GET.get('fin'))
    if not ini or not fin:
        return JsonResponse({'success': False}, status=400)

    medico = Medico.objects.get(usuario=request.user)
    bloques = BloqueoAgenda.objects.filter(medico=medico, fecha_inicio__lt=fin, fecha_fin__gt=ini)

    data = [{'inicio': b.fecha_inicio.isoformat(),
             'fin': b.fecha_fin.isoformat(),
             'motivo': b.motivo} for b in bloques]
    return JsonResponse(data, safe=False)

@login_required
@require_POST
def api_medico_bloqueos_crear(request):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False}, status=403)

    data = json.loads(request.body or '{}')
    bloques = data.get('bloques', [])
    medico = Medico.objects.get(usuario=request.user)

    for b in bloques:
        ini = _as_dt(b.get('inicio'))
        fin = _as_dt(b.get('fin'))
        motivo = b.get('motivo') or 'Bloqueo'
        if ini and fin and fin > ini:
            BloqueoAgenda.objects.create(medico=medico, fecha_inicio=ini, fecha_fin=fin, motivo=motivo)

    return JsonResponse({'success': True})

@login_required
@require_POST
def api_medico_bloqueos_eliminar(request):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False}, status=403)

    data = json.loads(request.body or '{}')
    fechas = [ _as_dt(f) for f in data.get('fechas', []) ]
    medico = Medico.objects.get(usuario=request.user)

    BloqueoAgenda.objects.filter(medico=medico, fecha_inicio__in=fechas).delete()
    return JsonResponse({'success': True})

@login_required
@require_POST
def api_medico_bloquear(request):
    if request.user.tipo_usuario != 'medico':
        return JsonResponse({'success': False}, status=403)

    data = json.loads(request.body or '{}')
    ini = _as_dt(data.get('inicio'))
    fin = _as_dt(data.get('fin'))
    motivo = data.get('motivo') or 'Bloqueo manual'

    if ini and fin and fin > ini:
        medico = Medico.objects.get(usuario=request.user)
        BloqueoAgenda.objects.create(medico=medico, fecha_inicio=ini, fecha_fin=fin, motivo=motivo)
        return JsonResponse({'success': True})
    return JsonResponse({'success': False}, status=400)
