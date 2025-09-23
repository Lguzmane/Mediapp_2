from django.contrib import admin
from django.urls import path, include
from Mediapp import views as mediapp_views

urlpatterns = [
    # Admin Django
    path('admin/', admin.site.urls),

    # Autenticación propia
    path('login/', mediapp_views.login_view, name='login'),
    path('registro/', mediapp_views.registro_view, name='registro'),
    path('recuperar/', mediapp_views.recuperar_view, name='password_reset'),
    path('logout/', mediapp_views.logout_view, name='logout'),

    # API (registro desde JS)
    path('api/registro/', mediapp_views.registro_api, name='registro_api'),

    # Django Allauth 
    path('accounts/', include('allauth.urls')),

    # Páginas del Médico
    path('medico/agenda/', mediapp_views.agenda_medico, name='agenda_medico'),
    path('medico/api/citas/', mediapp_views.api_medico_citas, name='api_medico_citas'),
    path('medico/api/bloqueos/', mediapp_views.api_medico_bloqueos, name='api_medico_bloqueos'),
    path('medico/api/bloqueos/crear/', mediapp_views.api_medico_bloqueos_crear, name='api_medico_bloqueos_crear'),
    path('medico/api/bloqueos/eliminar/', mediapp_views.api_medico_bloqueos_eliminar, name='api_medico_bloqueos_eliminar'),
    path('medico/api/bloquear/', mediapp_views.api_medico_bloquear, name='api_medico_bloquear'),

    # Páginas del Paciente
    path('paciente/perfil/', mediapp_views.perfil_paciente, name='perfil_paciente'),
    path('paciente/perfil/actualizar/', mediapp_views.actualizar_perfil_paciente, name='actualizar_perfil_paciente'),
    path('paciente/reservas/', mediapp_views.reservas_paciente, name='reservas_paciente'),
    path('paciente/citas/', mediapp_views.citas_paciente, name='citas_paciente'),

    # Páginas del Administrador
    path('panel/dashboard/', mediapp_views.dashboard_admin, name='dashboard_admin'),
    # API para admin.js (dashboard e informes)
path('admin/api/dashboard/', mediapp_views.api_admin_estadisticas, name='dashboard_data'),
path('admin/api/buscar-usuario/', mediapp_views.api_buscar_usuario, name='buscar_usuario'),
path('admin/api/generar-informe/', mediapp_views.api_generar_informe, name='generar_informe'),
path('admin/api/citas/', mediapp_views.api_citas_dashboard, name='citas_dashboard'),
path('admin/api/registros/', mediapp_views.api_registros_dashboard, name='registros_dashboard'),
path('admin/ver-usuario/', mediapp_views.ver_usuario_admin, name='ver_usuario'),
path('admin/editar-usuario/', mediapp_views.editar_usuario_admin, name='editar_usuario'),

    # Utilidades
    path('check-session/', mediapp_views.check_session, name='check_session'),
    path('component/<str:template_name>/', mediapp_views.component_view, name='component'),

    # Página inicial
    path('', mediapp_views.index, name='index'),

    # API de citas para paciente
path('paciente/api/citas/', mediapp_views.api_obtener_citas, name='api_obtener_citas'),
path('paciente/api/reservar/', mediapp_views.api_reservar_cita, name='api_reservar_cita'),
path('paciente/api/cancelar/', mediapp_views.api_cancelar_cita, name='api_cancelar_cita'),

path('medico/citas/<int:cita_id>/cancelar/', mediapp_views.cancelar_cita_medico, name='cancelar_cita_medico'),

# === NUEVAS RUTAS PARA RESERVA REAL ===
path('api/especialidades/', mediapp_views.api_especialidades, name='api_especialidades'),
path('api/medicos/', mediapp_views.api_medicos, name='api_medicos'),
path('api/disponibilidad/', mediapp_views.api_disponibilidad, name='api_disponibilidad'),
]
