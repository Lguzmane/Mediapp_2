from django.contrib import admin
from .models import Usuario, Especialidad, Medico, Cita, AgendaMedica, BloqueoAgenda

class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('email', 'get_full_name', 'tipo_usuario', 'rut', 'telefono')
    search_fields = ('email', 'first_name', 'last_name', 'rut', 'telefono')
    list_filter = ('tipo_usuario', 'genero')
    fieldsets = (
        ('Información Básica', {
            'fields': ('email', 'password', 'first_name', 'last_name', 'rut')
        }),
        ('Información Personal', {
            'fields': ('fecha_nacimiento', 'genero', 'nacionalidad', 'telefono', 'direccion')
        }),
        ('Información Médica', {
            'fields': ('grupo_sanguineo', 'alergias', 'condiciones_medicas', 'medicamentos', 'cirugias_previas')
        }),
        ('Permisos', {
            'fields': ('tipo_usuario', 'is_active', 'is_staff', 'is_superuser')
        }),
    )

class MedicoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'especialidad', 'años_experiencia')
    search_fields = ('usuario__first_name', 'usuario__last_name', 'especialidad__nombre')

class CitaAdmin(admin.ModelAdmin):
    list_display = ('id', 'paciente', 'medico', 'fecha', 'hora', 'estado')
    list_filter = ('estado', 'especialidad')
    search_fields = ('paciente__first_name', 'paciente__last_name', 'medico__usuario__first_name')

# Registro de modelos
admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Especialidad)
admin.site.register(Medico, MedicoAdmin)
admin.site.register(Cita, CitaAdmin)
admin.site.register(AgendaMedica)
admin.site.register(BloqueoAgenda)