README – MediApp (Entrega 3: API REST)
______________________________________________________________________________________
______________________________________________________________________________________

1. Descripción general
MediApp es un sistema web de gestión de citas médicas que en esta tercera entrega incorpora servicios expuestos como API REST.
El sistema incluye:

Endpoints propios para citas y médicos.

Integración con APIs externas para diagnóstico (ICD-10) y feriados de Chile.

Seguridad con autenticación JWT.
______________________________________________________________________________________

2. Endpoints implementados

Autenticación: /api/token/ (login vía email + password → entrega access/refresh tokens).

Médicos:
a) /api/medicos/ (listar)
b) /api/medicos/?especialidad_id=<id> (filtrar por especialidad)
c) /api/medicos/<id>/ (detalle + disponibilidad)

Citas:
a) /api/citas/ (GET = listar, POST = crear)
b) /api/citas/<id>/cancelar/ (PUT = cancelar con motivo)

ICD-10 (proxy externo): /api/icd/search/?q=<texto>
Nota: el texto debe ingresarse en inglés (ejemplo: headache, cough, fever).

Feriados Chile (proxy externo): /api/feriados/<año>/
______________________________________________________________________________________

3. Integración en las vistas

Paciente → Perfil:
• Campo “Antecedentes (ICD-10)” con autocompletado conectado al endpoint /api/icd/search/.
• Requiere escribir en inglés y al menos 3 letras para obtener sugerencias.

Médico → Agenda:
• Carga los feriados de Chile desde /api/feriados/<año>/.
• Los días feriados aparecen resaltados y los horarios de esos días se bloquean.
_____________________________________________________________________________________

4.Credenciales de prueba

Paciente:
• Email: aracely@gmail.com

• Password: Aa123456.

Médico:
• Email: eloisa@gmail.com

• Password: Aa123456.
______________________________________________________________________________________

5. Requisitos de ejecución

Python 3.13 y pip instalados.

Dependencias del proyecto: pip install -r requirements.txt

Migraciones de base de datos: python manage.py migrate

Iniciar servidor: python manage.py runserver

Acceso local: http://127.0.0.1:8000/
______________________________________________________________________________________

6. Documentos adjuntos

GUÍA DE CONSULTAS API - MEDIAPP.txt: contiene las pruebas para PowerShell para demostrar cada endpoint.

Código fuente completo del proyecto.

______________________________________________________________________________________

7. Observaciones finales

El sistema funciona con autenticación JWT, por lo que cada consulta a los endpoints debe incluir el encabezado Authorization con el token de acceso.

El campo ICD-10 está diseñado para responder únicamente a términos en inglés.

Si el servicio externo de feriados no responde, la agenda sigue operativa, solo sin resaltar feriados.