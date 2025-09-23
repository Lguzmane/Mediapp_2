// =============================================
// INICIALIZACIÓN DEL ADMINISTRADOR
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales del dashboard
    cargarDashboard();
    
    // Configurar eventos del formulario de informes
    configurarFormularioInformes();
    
    // Cargar tablas de datos
    cargarTablaCitas();
    cargarTablaRegistros();
    
    // Configurar componentes dinámicos
    configurarComponentes();
});

// =============================================
// FUNCIONES DEL DASHBOARD
// =============================================
// =============================================
// FUNCIONES DEL DASHBOARD
// =============================================
function cargarDashboard() {
    fetch(APP_ROUTES.admin.dashboard_data)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener los datos del dashboard');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('citas-hoy').textContent = data.citas_hoy;
            document.getElementById('medicos-activos').textContent = data.medicos_activos;
            document.querySelectorAll('.card-value')[2].textContent = data.pacientes;
            document.querySelectorAll('.card-value')[3].textContent = data.pendientes;
        })
        .catch(error => {
            console.error('Error al cargar el dashboard:', error);
        });
}


// =============================================
// MANEJO DE INFORMES
// =============================================
function configurarFormularioInformes() {
    const tipoInforme = document.getElementById('tipo-informe');
    const buscarRutBtn = document.getElementById('buscar-rut');
    const rutInput = document.getElementById('rut-busqueda');
    const resultadoBusqueda = document.getElementById('resultado-busqueda');
    const seleccionarRutBtn = document.getElementById('seleccionar-rut');
    const generarInformeBtn = document.getElementById('generar-informe');
    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaFin = document.getElementById('fecha-fin');

    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    fechaInicio.valueAsDate = hace30Dias;
    fechaFin.valueAsDate = hoy;

    tipoInforme.addEventListener('change', () => {
        rutInput.placeholder = tipoInforme.value === 'medico'
            ? 'RUT médico (ej: 12345678-9)'
            : 'RUT paciente (ej: 98765432-1)';
    });

    buscarRutBtn.addEventListener('click', () => {
        if (!validarRUT(rutInput.value)) {
            alert('Por favor ingrese un RUT válido');
            rutInput.focus();
            return;
        }

        resultadoBusqueda.style.display = 'none';

        fetch(`${APP_ROUTES.admin.buscar_usuario}?rut=${encodeURIComponent(rutInput.value)}&tipo=${tipoInforme.value}`)
            .then(response => {
                if (!response.ok) throw new Error('No se encontró el usuario');
                return response.json();
            })
            .then(data => {
                document.getElementById('rut-resultado').textContent = data.rut;
                document.getElementById('nombre-resultado').textContent = data.nombre;
                resultadoBusqueda.classList.add('active');
                validarFormulario();
            })
            .catch(error => {
                alert('No se encontró el usuario');
                console.error(error);
            });
    });

    seleccionarRutBtn.addEventListener('click', () => {
        rutInput.value = document.getElementById('rut-resultado').textContent;
        resultadoBusqueda.classList.remove('active');
        validarFormulario();
    });

    fechaInicio.addEventListener('change', validarFormulario);
    fechaFin.addEventListener('change', validarFormulario);

    generarInformeBtn.addEventListener('click', () => {
        if (!generarInformeBtn.disabled) {
            generarInforme();
        }
    });

    function validarFormulario() {
        const rutValido = validarRUT(rutInput.value);
        const fechasValidas = fechaInicio.value && fechaFin.value &&
            new Date(fechaInicio.value) <= new Date(fechaFin.value);

        generarInformeBtn.disabled = !(rutValido && fechasValidas);
    }

    function generarInforme() {
        const tipo = tipoInforme.value;
        const rut = rutInput.value;
        const desde = fechaInicio.value;
        const hasta = fechaFin.value;

        generarInformeBtn.innerHTML = '<i class="bi bi-hourglass"></i> Generando...';
        generarInformeBtn.disabled = true;

        fetch(APP_ROUTES.admin.generar_informe, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ tipo, rut, desde, hasta })
        })
            .then(response => {
                if (!response.ok) throw new Error('Error al generar informe');
                return response.json();
            })
            .then(data => {
                alert(`Informe generado:\n\n${data.mensaje}`);
            })
            .catch(error => {
                alert('No se pudo generar el informe');
                console.error(error);
            })
            .finally(() => {
                generarInformeBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Generar';
                generarInformeBtn.disabled = false;
            });
    }
}



// =============================================
// MANEJO DE TABLAS DE DATOS
// =============================================
function cargarTablaCitas() {
    const tabla = document.querySelector('#tabla-citas tbody');
    tabla.innerHTML = '';

    fetch(APP_ROUTES.admin.citas_dashboard)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar citas');
            }
            return response.json();
        })
        .then(citas => {
            citas.forEach(cita => {
                const fila = document.createElement('tr');

                fila.innerHTML = `
                    <td>${cita.paciente}</td>
                    <td>${cita.medico}</td>
                    <td>${cita.fecha}</td>
                    <td><span class="badge ${getClaseEstado(cita.estado)}">${cita.estado}</span></td>
                    <td class="text-end">
                        <button class="btn-action ver"><i class="bi bi-eye"></i></button>
                        <button class="btn-action editar"><i class="bi bi-pencil"></i></button>
                    </td>
                `;

                tabla.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function cargarTablaRegistros() {
    const tabla = document.querySelector('.data-table tbody');
    tabla.innerHTML = '';

    fetch(APP_ROUTES.admin.registros_dashboard)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar registros');
            }
            return response.json();
        })
        .then(registros => {
            registros.forEach(reg => {
                const fila = document.createElement('tr');

                fila.innerHTML = `
                    <td>${reg.nombre}</td>
                    <td>${reg.tipo}</td>
                    <td>${reg.fecha}</td>
                    <td><span class="badge ${getClaseEstado(reg.estado)}">${reg.estado}</span></td>
                `;

                tabla.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// =============================================
// CONFIGURACIÓN DE COMPONENTES
// =============================================
function configurarComponentes() {
    // Tooltips de Bootstrap
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el);
    });

    // Acciones de botones en la tabla
    document.addEventListener('click', function (e) {
        if (e.target.closest('.btn-action.ver')) {
            const fila = e.target.closest('tr');
            const rut = fila.dataset.rut;
            window.location.href = `${APP_ROUTES.admin.ver_usuario}?rut=${rut}`;
        }

        if (e.target.closest('.btn-action.editar')) {
            const fila = e.target.closest('tr');
            const rut = fila.dataset.rut;
            window.location.href = `${APP_ROUTES.admin.editar_usuario}?rut=${rut}`;
        }
    });
}


// =============================================
// FUNCIONES UTILITARIAS
// =============================================
// Validar formato de RUT chileno
function validarRUT(rut) {
    if (!rut) return false;
    
    // Eliminar puntos y guión
    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
    
    // Validar formato básico
    if (!/^[0-9]+[0-9kK]{1}$/.test(rutLimpio)) return false;
    
    // Validar dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    let suma = 0;
    let multiplo = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i)) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
    
    return dvCalculado === dv;
}

// Formatear RUT con puntos y guión
function formatearRUT(rut) {
    if (!rut) return '';
    
    // Eliminar caracteres no numéricos
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    
    if (rutLimpio.length < 2) return rut;
    
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    // Agregar puntos cada 3 dígitos
    let cuerpoFormateado = '';
    for (let i = cuerpo.length - 1, j = 1; i >= 0; i--, j++) {
        cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
        if (j % 3 === 0 && i !== 0) cuerpoFormateado = '.' + cuerpoFormateado;
    }
    
    return `${cuerpoFormateado}-${dv}`;
}

// Obtener clase CSS según estado
function getClaseEstado(estado) {
    const estados = {
        'Confirmada': 'badge-success',
        'Activo': 'badge-success',
        'Pendiente': 'badge-warning',
        'Cancelada': 'badge-danger'
    };
    
    return estados[estado] || 'badge-secondary';
}