# Mediapp/serializers.py
from rest_framework import serializers
from .models import Cita, Medico, Especialidad, Usuario

class CitaSerializer(serializers.ModelSerializer):
    # Para crear: aceptamos IDs (write_only)
    paciente_id = serializers.PrimaryKeyRelatedField(
        source='paciente', queryset=Usuario.objects.all(), write_only=True, required=False
    )
    medico_id = serializers.PrimaryKeyRelatedField(
        source='medico', queryset=Medico.objects.all(), write_only=True
    )
    especialidad_id = serializers.PrimaryKeyRelatedField(
        source='especialidad', queryset=Especialidad.objects.all(), write_only=True
    )

    class Meta:
        model = Cita
        fields = [
            'id',
            # write-only para crear
            'paciente_id', 'medico_id', 'especialidad_id',
            # read-only/lectura
            'paciente', 'medico', 'especialidad',
            'fecha', 'hora', 'estado', 'motivo_cancelacion', 'fecha_creacion',
        ]
        read_only_fields = ['paciente', 'medico', 'especialidad', 'estado', 'motivo_cancelacion', 'fecha_creacion']

    def validate(self, attrs):
        """
        Reglas: 
        - especialidad debe calzar con la del médico (si tiene).
        - no debe existir cita agendada para el mismo médico/fecha/hora.
        """
        data = super().validate(attrs)
        medico = data.get('medico') or self.initial_data.get('medico_id')
        especialidad = data.get('especialidad') or self.initial_data.get('especialidad_id')
        fecha = data.get('fecha') or self.initial_data.get('fecha')
        hora = data.get('hora') or self.initial_data.get('hora')

        # Obtener instancias si vienen como IDs
        if hasattr(medico, 'pk') is False and medico:
            medico = Medico.objects.filter(pk=medico).first()
        if hasattr(especialidad, 'pk') is False and especialidad:
            especialidad = Especialidad.objects.filter(pk=especialidad).first()

        if not (medico and especialidad and fecha and hora):
            return data

        # Consistencia especialidad ↔ médico
        if medico.especialidad_id and medico.especialidad_id != especialidad.id:
            raise serializers.ValidationError({'especialidad_id': 'La especialidad no coincide con la del médico.'})

        # Colisión (mismo médico, fecha, hora, estado=agendada)
        from .models import Cita  # evitar import circular
        existe = Cita.objects.filter(medico=medico, fecha=fecha, hora=hora, estado='agendada').exists()
        if existe:
            raise serializers.ValidationError({'hora': 'Ese horario ya está tomado para ese médico.'})

        return data

class UsuarioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'first_name', 'last_name', 'email']

class EspecialidadLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = ['id', 'nombre']

class MedicoSerializer(serializers.ModelSerializer):
    usuario = UsuarioLiteSerializer(read_only=True)
    especialidad = EspecialidadLiteSerializer(read_only=True)

    class Meta:
        model = Medico
        fields = ['id', 'usuario', 'especialidad']