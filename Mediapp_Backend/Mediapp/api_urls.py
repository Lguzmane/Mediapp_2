# Mediapp/api_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import CitaViewSet, MedicoViewSet, ICDSearchView, FeriadosChileView

router = DefaultRouter()
router.register(r'citas', CitaViewSet, basename='citas')
router.register(r'medicos', MedicoViewSet, basename='medicos')

urlpatterns = [
    path('', include(router.urls)),
    path('icd/search/', ICDSearchView.as_view()),           # GET /api/icd/search/?q=dolor cabeza
    path('feriados/<int:year>/', FeriadosChileView.as_view())  # GET /api/feriados/2025/
]
