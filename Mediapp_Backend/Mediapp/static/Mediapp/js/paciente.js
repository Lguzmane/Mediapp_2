console.log("paciente.js cargado");
document.addEventListener('DOMContentLoaded', function() {


    let medicoSeleccionado = null;
    let fechaSeleccionada = null;
    let horaSeleccionada = null;

    // ===== Funciones auxiliares =====
async function obtenerCitas() {
    try {
        const res = await fetch('/paciente/api/citas/');
        if (!res.ok) throw new Error("Error al obtener citas");
        return await res.json();
    } catch (err) {
        console.error("Error al obtener citas:", err);
        return [];
    }
}

async function guardarCita(nuevaCita) {
    try {
        const res = await fetch('/paciente/api/reservar/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(nuevaCita)
        });
        const data = await res.json();
        return data.success;
    } catch (err) {
        console.error("Error al guardar cita:", err);
        return false;
    }
}


    // ===== RESERVAS =====
    // ===== RESERVAS (REAL, SIN DATOS HARDCODE) =====
if (document.getElementById('selectEspecialidad') && window.location.pathname.includes('paciente/reservas')) {

  // 1) Cargar especialidades reales
  (async function cargarEspecialidades() {
    try {
      const res = await fetch('/api/especialidades/');
      if (!res.ok) throw new Error('No se pudieron cargar especialidades');
      const data = await res.json();
      const sel = document.getElementById('selectEspecialidad');
      sel.innerHTML = '<option value="">Seleccione...</option>';
      data.forEach(e => sel.insertAdjacentHTML('beforeend', `<option value="${e.id}">${e.nombre}</option>`));
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudieron cargar las especialidades', 'error');
    }
  })();

  let medicoSeleccionado = null;

  // 2) Al elegir especialidad, pedir médicos reales
  document.getElementById('selectEspecialidad').addEventListener('change', async function() {
    const espId = this.value;
    const seccionMedicos = document.getElementById('seccionMedicos');
    const listaMedicos = document.getElementById('listaMedicos');

    document.getElementById('seccionFechaHora').classList.add('d-none');
    medicoSeleccionado = null;

    if (!espId) { seccionMedicos.classList.add('d-none'); return; }

    try {
      const res = await fetch(`/api/medicos/?especialidad_id=${encodeURIComponent(espId)}`);
      if (!res.ok) throw new Error('No se pudieron cargar médicos');
      const medicos = await res.json();

      listaMedicos.innerHTML = '';
      medicos.forEach(med => {
        listaMedicos.insertAdjacentHTML('beforeend', `
          <div class="col-md-6">
            <div class="card medico-card" data-medico-id="${med.id}">
              <div class="card-body text-center">
                <h6 class="card-title">${med.nombre}</h6>
                <button class="btn btn-sm btn-outline-primary btn-seleccionar-medico">Seleccionar</button>
              </div>
            </div>
          </div>`);
      });
      seccionMedicos.classList.remove('d-none');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudieron cargar los médicos', 'error');
    }
  });

  // 3) Seleccionar médico → mostrar fecha y luego disponibilidad
  document.getElementById('listaMedicos').addEventListener('click', function(e) {
    if (!e.target.classList.contains('btn-seleccionar-medico')) return;
    const card = e.target.closest('.medico-card');
    medicoSeleccionado = parseInt(card.getAttribute('data-medico-id'));
    document.getElementById('seccionFechaHora').classList.remove('d-none');
    initCalendario();
  });

  function initCalendario() {
    flatpickr("#inputFecha", {
      locale: "es",
      minDate: "today",
      maxDate: new Date().fp_incr(30),
      disable: [ d => (d.getDay() === 0) ], // opcional: sin domingos
      onChange: async function(selectedDates) {
        const fecha = selectedDates[0]?.toISOString().slice(0,10);
        if (!fecha || !medicoSeleccionado) return;
        try {
          const res = await fetch(`/api/disponibilidad/?medico_id=${medicoSeleccionado}&fecha=${fecha}`);
          if (!res.ok) throw new Error('No se pudo cargar disponibilidad');
          const horas = await res.json();
          renderHoras(horas);
        } catch (e) {
          console.error(e);
          Swal.fire('Error', 'No se pudo cargar la disponibilidad', 'error');
        }
      }
    });
  }

  function renderHoras(horas) {
    const contenedor = document.getElementById('horasContainer');
    if (!horas.length) {
      contenedor.innerHTML = `<div class="alert alert-secondary">No hay horas disponibles este día.</div>`;
      return;
    }
    contenedor.innerHTML = `<div class="d-flex flex-wrap"></div>`;
    const wrap = contenedor.firstChild;
    horas.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'hora-btn btn btn-outline-primary btn-sm me-2 mb-2';
      btn.textContent = h;
      btn.addEventListener('click', function() {
        document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
      wrap.appendChild(btn);
    });
  }

  // 4) Confirmar reserva real (con IDs y formatos ISO)
  document.getElementById('btnConfirmar').addEventListener('click', async function() {
    const espId = document.getElementById('selectEspecialidad').value;
    const fecha = document.getElementById('inputFecha').value; // YYYY-MM-DD
    const hora = document.querySelector('.hora-btn.active')?.textContent; // HH:MM

    if (!fecha || !hora || !espId || !medicoSeleccionado) {
      Swal.fire({ title: 'Datos incompletos', text: 'Seleccione especialidad, médico, fecha y hora', icon: 'warning' });
      return;
    }

    try {
      const res = await fetch('/paciente/api/reservar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({
          medico_id: medicoSeleccionado,
          especialidad_id: parseInt(espId),
          fecha, // YYYY-MM-DD
          hora   // HH:MM
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ title: 'Reserva confirmada', icon: 'success' }).then(() => {
          window.location.href = '/paciente/citas/';
        });
      } else {
        Swal.fire({ title: 'Error', text: data.message || 'No se pudo confirmar la reserva', icon: 'error' });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ title: 'Error', text: 'No se pudo confirmar la reserva', icon: 'error' });
    }
  });
}


    // ===== CITAS =====
        // ===== CITAS =====
    if (document.getElementById('citas-container') && window.location.pathname.includes('paciente/citas')) {

        // Cargar citas al iniciar
        obtenerCitas().then(citas => cargarCitas(citas));
        
        // Manejar cancelación
        document.addEventListener('click', async function(e) {
            if (e.target.classList.contains('btn-cancelar')) {
                const citaId = parseInt(e.target.closest('.card-cita').getAttribute('data-cita-id'));
                
                Swal.fire({
                    title: 'Confirmar cancelación',
                    text: '¿Estás segura de cancelar esta cita?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, cancelar',
                    cancelButtonText: 'Volver'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const res = await fetch('/paciente/api/cancelar/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': getCSRFToken()
                                },
                                body: JSON.stringify({ cita_id: citaId })
                            });
                            const data = await res.json();
                            if (data.success) {
                                Swal.fire('Cancelada', 'La cita ha sido cancelada', 'success')
                                    .then(() => location.reload());
                            } else {
                                Swal.fire('Error', data.message || 'No se pudo cancelar', 'error');
                            }
                        } catch (err) {
                            console.error(err);
                            Swal.fire('Error', 'Ocurrió un problema al cancelar', 'error');
                        }
                    }
                });
            }

            // Manejar reagendación
            if (e.target.classList.contains('btn-reagendar')) {
                const citaId = parseInt(e.target.closest('.card-cita').getAttribute('data-cita-id'));
                // 🔧 Puedes usar un modal o pasar este ID por URL para reagendar
                sessionStorage.setItem('citaAReagendar', citaId);
                window.location.href = '/paciente/reservas/';
            }
        });
    }

    // Función para cargar citas 
    function cargarCitas(citas) {
        citas = citas.filter(c => c.medicoNombre && c.especialidadNombre); // Validación de seguridad

        const citasContainer = document.getElementById('citas-container');
        const historialContainer = document.getElementById('historial-container');

        citasContainer.innerHTML = '<h6 class="text-muted">Tus nuevas citas</h6>';
        historialContainer.innerHTML = '<h6 class="text-muted">Historial</h6>';

        const citasAgendadas = citas.filter(c => c.estado === 'agendada');
        const citasCompletadas = citas.filter(c => c.estado === 'completada');

        // ======================
        // Ejemplo agendado: Dra. Ana Silva
        // ======================
        citasContainer.innerHTML += `
            <div class="card card-cita mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title mb-1">Dra. Felipe Avello</h6>
                            <p class="card-text text-muted small mb-2">Médico General</p>
                        </div>
                        <span class="badge bg-primary">Agendada</span>
                    </div>
                    <div class="separador my-2"></div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="d-block"><i class="bi bi-calendar-date"></i> 20/07/2025</span>
                            <span class="d-block"><i class="bi bi-clock"></i> 11:00</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary disabled me-2">
                                <i class="bi bi-calendar2-week"></i> Reagendar
                            </button>
                            <button class="btn btn-sm btn-outline-danger disabled">
                                <i class="bi bi-x-circle"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ======================
        // Ejemplo completado: Dr. Juan Pérez
        // ======================
        historialContainer.innerHTML += `
            <div class="card card-cita mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title mb-1">Dr. Alonso Aguilera</h6>
                            <p class="card-text text-muted small mb-2">Médico General</p>
                        </div>
                        <span class="badge bg-success">Completada</span>
                    </div>
                    <div class="separador my-2"></div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="d-block"><i class="bi bi-calendar-date"></i> 10/07/2025</span>
                            <span class="d-block"><i class="bi bi-clock"></i> 10:30</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ======================
        // Citas reales agendadas
        // ======================
        citasAgendadas.forEach(cita => {
            const citaHTML = `
                <div class="card card-cita mb-3" data-cita-id="${cita.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${cita.medicoNombre}</h6>
                                <p class="card-text text-muted small mb-2">${cita.especialidadNombre}</p>
                            </div>
                            <span class="badge bg-primary">Agendada</span>
                        </div>
                        <div class="separador my-2"></div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="d-block"><i class="bi bi-calendar-date"></i> ${new Date(cita.fecha).toLocaleDateString('es')}</span>
                                <span class="d-block"><i class="bi bi-clock"></i> ${cita.hora}</span>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-secondary btn-reagendar me-2" data-cita-id="${cita.id}">
                                    <i class="bi bi-calendar2-week"></i> Reagendar
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-cancelar" data-cita-id="${cita.id}">
                                    <i class="bi bi-x-circle"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            citasContainer.insertAdjacentHTML('beforeend', citaHTML);
        });

        // ======================
        // Citas reales completadas
        // ======================
        citasCompletadas.forEach(cita => {
            const citaHTML = `
                <div class="card card-cita mb-3" data-cita-id="${cita.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${cita.medicoNombre}</h6>
                                <p class="card-text text-muted small mb-2">${cita.especialidadNombre}</p>
                            </div>
                            <span class="badge bg-success">Completada</span>
                        </div>
                        <div class="separador my-2"></div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="d-block"><i class="bi bi-calendar-date"></i> ${new Date(cita.fecha).toLocaleDateString('es')}</span>
                                <span class="d-block"><i class="bi bi-clock"></i> ${cita.hora}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            historialContainer.insertAdjacentHTML('beforeend', citaHTML);
        });
    }

 

// ========================
// PERFIL DEL PACIENTE
// ========================

// Lista de campos a editar
const campos = [
"nombre", "fechaNacimiento", "genero", "documento", "nacionalidad",
"telefono", "email", "direccion", "grupoSanguineo", "alergias",
"condiciones", "medicamentos", "cirugias"
];

const btnEditar = document.getElementById("btnEditar");
const btnGuardar = document.getElementById("btnGuardar");
const form = document.getElementById("perfilForm");

// 1. Obtener datos del backend desde el <script type="application/json">
// 1. Obtener datos del backend desde el <script type="application/json">
const datosEl = document.getElementById("datosPaciente");
const paciente = datosEl ? JSON.parse(datosEl.textContent || "{}") : {};

// 2. Rellenar los campos del formulario
campos.forEach(campo => {
const elemento = document.getElementById(campo);
if (elemento && paciente[campo] !== undefined) {
if (elemento.tagName === "SELECT") {
elemento.value = paciente[campo];
} else {
elemento.value = paciente[campo];
}
}
});

// 3. Al hacer clic en "Editar", habilitar los campos
if (btnEditar && btnGuardar) {
  btnEditar.addEventListener("click", () => {
    campos.forEach(campo => {
      const elemento = document.getElementById(campo);
      if (elemento) {
        elemento.disabled = false;
      }
    });
    btnGuardar.classList.remove("d-none");
    btnEditar.classList.add("d-none");
  });
}


// 4. Enviar datos actualizados al backend
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datosActualizados = {};
    campos.forEach(campo => {
      const elemento = document.getElementById(campo);
      if (elemento) {
        datosActualizados[campo] = elemento.value;
      }
    });

    try {
      const response = await fetch("/paciente/perfil/actualizar/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken()
        },
        body: JSON.stringify(datosActualizados)
      });

      const result = await response.json();
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Perfil actualizado con éxito",
          timer: 1500,
          showConfirmButton: false
        });

        campos.forEach(campo => {
          const elemento = document.getElementById(campo);
          if (elemento) {
            elemento.disabled = true;
          }
        });

        if (btnGuardar && btnEditar) {
          btnGuardar.classList.add("d-none");
          btnEditar.classList.remove("d-none");
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message || "No se pudo actualizar el perfil"
        });
      }
    } catch (err) {
      console.error("Error al actualizar:", err);
      Swal.fire({
        icon: "error",
        title: "Error de red",
        text: "Ocurrió un error inesperado"
      });
    }
  });
}


// CSRF Token desde cookie
function getCSRFToken() {
    const name = "csrftoken";
    const cookie = document.cookie.split("; ").find(c => c.startsWith(name + "="));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
}

} // cierre final de DOMContentLoaded
);