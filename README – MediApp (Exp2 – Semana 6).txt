README – MediApp (Exp2 – Semana 6)
________________________________________
1. Descripción general
MediApp es un sistema web para gestión de citas médicas con roles diferenciados:
•	Paciente: puede registrarse, editar su perfil, reservar y cancelar citas.
•	Médico: administra su agenda, bloquea o activa horarios y ve la lista de pacientes.
•	Administrador: accede a un dashboard con estadísticas e informes. (en construcción)

Stack:
•	Backend: Django 5 + modelo de usuario personalizado.
•	Base de datos: Oracle XE, tablas generadas por migraciones de Django y script SQL de apoyo.
•	Frontend: Templates Bootstrap + JavaScript por rol (paciente.js, medico.js, admin.js).
•	Autenticación: Sesión Django con CSRF por cookie.
________________________________________
2. Credenciales de prueba
Estas credenciales están listas para usar tras el rehash de contraseñas:
Paciente
•	Email: lorena@gmail.com
•	Password: Aa123456.
Médico
•	Email: eloisa@gmail.com
•	Password: Aa123456.
Administrador (en construcción)
•	Email: vlado@gmail.com
•	Password: Aa123456.
________________________________________
3. Flujos principales
•	Paciente: inicia sesión → perfil → reservar hora → ver citas agendadas/historial.
•	Médico: agenda semanal → puede bloquear o liberar horarios → ver pacientes citados.
•	Admin: login → dashboard → generar informes y estadísticas de usuarios y citas.
________________________________________
4. Instrucciones de ejecución
Backend
1.	Clonar repositorio:
git clone https://github.com/Lguzmane/Mediapp_1/
cd Mediapp_1
2.	Instalar dependencias:
pip install -r requirements.txt
3.	Ejecutar migraciones:
python manage.py makemigrations
python manage.py migrate
4.	Rehash de contraseñas de usuarios de prueba:
python manage.py shell < RehashContraseñas.py
Base de datos Oracle
•	Las tablas se crean automáticamente con migraciones de Django.
•	Se adjunta el archivo Mediapp.sql como referencia académica de estructura y datos iniciales, pero no es necesario para levantar el sistema.
Ejecución del servidor
•	python manage.py runserver
•	Abrir en navegador: http://127.0.0.1:8000
________________________________________
5. Responsividad
Diseño adaptativo con FlexBox y Bootstrap.
Funciona en desktop, tablet y móvil (breakpoints >992px, 768–992px, <768px).
________________________________________
6. Formularios funcionales
•	Registro
•	Login
•	Recuperación de contraseña
•	Perfil de paciente (editar datos)
•	Agenda del médico (bloquear y liberar horarios)
________________________________________
7. Observaciones
•	El sistema implementa roles diferenciados (paciente, médico, administrador).
•	La gestión de citas es persistente en Oracle.
•	El archivo Mediapp.sql se entrega solo como referencia académica de la base de datos.
•	El código fuente está en GitHub: https://github.com/Lguzmane/Mediapp_2/
