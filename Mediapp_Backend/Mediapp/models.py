from django.db import models
from django.contrib.auth.models import AbstractUser

#  Modelo de Usuario (Personalizado)
class Usuario(AbstractUser):
    # Campos básicos
    rut = models.CharField(max_length=12, unique=True, verbose_name="RUT")
    tipo_usuario = models.CharField(max_length=10, choices=[
        ('paciente', 'Paciente'),
        ('medico', 'Médico'),
        ('admin', 'Administrador'),
    ], default='paciente')
    telefono = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    direccion = models.TextField(blank=True, verbose_name="Dirección")
    fecha_nacimiento = models.DateField(null=True, blank=True, verbose_name="Fecha de Nacimiento")
    email = models.EmailField(unique=True, verbose_name="Correo Electrónico")
    
    # Campos adicionales para pacientes
    genero = models.CharField(
        max_length=17,
        choices=[
            ('masculino', 'Masculino'),
            ('femenino', 'Femenino'),
            ('otro', 'Otro'),
            ('prefiero_no_decir', 'Prefiero no decir')
        ],
        blank=True,
        verbose_name="Género"
    )
    nacionalidad = models.CharField(max_length=50, blank=True, verbose_name="Nacionalidad")
    
    # Campos médicos
    grupo_sanguineo = models.CharField(
        max_length=5,
        choices=[
            ('A+', 'A+'),
            ('A-', 'A-'),
            ('B+', 'B+'),
            ('B-', 'B-'),
            ('AB+', 'AB+'),
            ('AB-', 'AB-'),
            ('O+', 'O+'),
            ('O-', 'O-')
        ],
        blank=True,
        verbose_name="Grupo Sanguíneo"
    )
    alergias = models.TextField(blank=True, verbose_name="Alergias conocidas")
    condiciones_medicas = models.TextField(blank=True, verbose_name="Condiciones médicas preexistentes")
    medicamentos = models.TextField(blank=True, verbose_name="Medicamentos actuales")
    cirugias_previas = models.TextField(blank=True, verbose_name="Cirugías previas")

    # Configuración de autenticación
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'rut', 'tipo_usuario']

    def __str__(self):
        return f"{self.get_full_name()} ({self.tipo_usuario})"

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

#  Modelo de Especialidad
class Especialidad(models.Model):
    nombre = models.CharField(max_length=50, verbose_name="Nombre de la Especialidad")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = "Especialidades"

#  Modelo de Médico
class Medico(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_medico')
    especialidad = models.ForeignKey(Especialidad, on_delete=models.SET_NULL, null=True, verbose_name="Especialidad")
    años_experiencia = models.PositiveIntegerField(default=0, verbose_name="Años de Experiencia")
    registro_medico = models.CharField(max_length=50, verbose_name="Registro Médico")

    def __str__(self):
        return f"Dr. {self.usuario.get_full_name()} - {self.especialidad}"

#  Modelo de Cita
class Cita(models.Model):
    paciente = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='citas_paciente')
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name='citas_medico')
    especialidad = models.ForeignKey(Especialidad, on_delete=models.SET_NULL, null=True, verbose_name="Especialidad")
    fecha = models.DateField(verbose_name="Fecha de la Cita")
    hora = models.TimeField(verbose_name="Hora de la Cita")
    estado = models.CharField(max_length=20, choices=[
        ('agendada', 'Agendada'),
        ('cancelada', 'Cancelada'),
        ('completada', 'Completada'),
    ], default='agendada')
    motivo_cancelacion = models.TextField(blank=True, null=True, verbose_name="Motivo de Cancelación")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    def __str__(self):
        return f"Cita #{self.id} - {self.paciente} con {self.medico}"

#  Modelo de Agenda Médica
class AgendaMedica(models.Model):
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name='agenda')
    dia_semana = models.CharField(max_length=10, choices=[
        ('lunes', 'Lunes'),
        ('martes', 'Martes'),
        ('miércoles', 'Miércoles'),
        ('jueves', 'Jueves'),
        ('viernes', 'Viernes'),
    ], verbose_name="Día de la Semana")
    hora_inicio = models.TimeField(verbose_name="Hora de Inicio")
    hora_fin = models.TimeField(verbose_name="Hora de Fin")
    duracion_cita = models.PositiveIntegerField(default=30, verbose_name="Duración de Cita (min)")

    def __str__(self):
        return f"Agenda de {self.medico} - {self.dia_semana}"

#  Modelo de Bloqueo de Agenda
class BloqueoAgenda(models.Model):
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name='bloqueos')
    fecha_inicio = models.DateTimeField(verbose_name="Fecha/Hora de Inicio")
    fecha_fin = models.DateTimeField(verbose_name="Fecha/Hora de Fin")
    motivo = models.CharField(max_length=255, verbose_name="Motivo del Bloqueo")

    def __str__(self):
        return f"Bloqueo: {self.medico} - {self.fecha_inicio}"