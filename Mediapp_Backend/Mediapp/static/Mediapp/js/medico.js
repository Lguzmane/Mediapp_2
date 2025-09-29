console.log('medico.js build 2025-09-22-02');

document.addEventListener('DOMContentLoaded', function () {

    // =============================================
    // VARIABLES GLOBALES Y CONSTANTES
    // =============================================
    let currentDate = new Date();
    let appointments = [];
    let blockedSlots = [];
    let selectedSlots = [];

    // Elementos del DOM
    const currentWeekElement = document.getElementById('current-week');
    const prevWeekButton = document.getElementById('prev-week');
    const nextWeekButton = document.getElementById('next-week');
    const timeSlotsContainer = document.getElementById('time-slots');
    const blockTimeButton = document.getElementById('block-time');
    const refreshButton = document.getElementById('refresh');
    const blockModal = document.getElementById('block-modal');
    const appointmentModal = document.getElementById('appointment-modal');
    const blockForm = document.getElementById('block-form');
    const appointmentDetails = document.getElementById('appointment-details');
    const viewPatientButton = document.getElementById('view-patient');
    const cancelAppointmentButton = document.getElementById('cancel-appointment');

    // =============================================
    // CONFIGURACIÓN INICIAL
    // =============================================
    refreshButton.textContent = 'Liberar Horario';
    refreshCalendar();

    // =============================================
    // MANEJADORES DE EVENTOS PRINCIPALES
    // =============================================
    prevWeekButton.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    refreshCalendar();
    // limpiar selección sin depender de clearSelection()
    selectedSlots.forEach(s => s.cell.classList.remove('selected'));
    selectedSlots = [];
    updateButtonStates();
});

    nextWeekButton.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    refreshCalendar();
    // limpiar selección sin depender de clearSelection()
    selectedSlots.forEach(s => s.cell.classList.remove('selected'));
    selectedSlots = [];
    updateButtonStates();
});

    blockTimeButton.addEventListener('click', () => {
        if (selectedSlots.length > 0) {
            reserveSelectedSlots();
        } else {
            openBlockModal();
        }
    });

    refreshButton.addEventListener('click', () => {
        if (selectedSlots.length > 0) {
            freeSelectedSlots();
        } else {
            refreshCalendar();
        }
    });

    viewPatientButton.addEventListener('click', viewPatientProfile);
    cancelAppointmentButton.addEventListener('click', cancelAppointment);

    // Cerrar modales al hacer clic en la X
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function (event) {
        if (event.target === blockModal) blockModal.style.display = 'none';
        if (event.target === appointmentModal) appointmentModal.style.display = 'none';
    });

    // =============================================
    // FUNCIONES PRINCIPALES DEL CALENDARIO
    // =============================================
    function refreshCalendar() {
        updateWeekDisplay();
        updateCalendarHeader();
        generateTimeSlots();
        markHolidaysInView(); // ← NUEVO: pinta y desactiva días feriados
        loadAppointments();
        loadBlockedSlots();
    }

    function updateWeekDisplay() {
        const start = getStartOfWeek(currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        currentWeekElement.textContent = `${start.toLocaleDateString('es-ES', options)} - ${end.toLocaleDateString('es-ES', options)}`;
    }

    function updateCalendarHeader() {
        const headerRow = document.querySelector('.calendar-header');
        headerRow.innerHTML = '<div class="time-column">Hora</div>';

        const startOfWeek = getStartOfWeek(currentDate);
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        for (let i = 0; i < 6; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + i);
            const dayNum = dayDate.getDate();
            const month = dayDate.toLocaleString('es-ES', { month: 'short' });

            const div = document.createElement('div');
            div.className = 'day-column';
            div.textContent = `${dayNames[i]} ${dayNum} ${month}`;
            headerRow.appendChild(div);
        }
    }

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

//NUEVO 24-09

// ===== FERIADOS (cache + fetch + pintado) =====
const __feriadosCache = {}; // { '2025': [ { fecha:'2025-01-01', nombre:'Año Nuevo' }, ... ] }

async function fetchFeriados(year) {
  if (__feriadosCache[year]) return __feriadosCache[year];

  // Usar Nager directo (evita 502 del backend y no muestra error en Network)
  const r = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/CL`);
  if (!r.ok) { __feriadosCache[year] = []; return []; }
  const d = await r.json();
  const normalizado = Array.isArray(d)
    ? d.map(h => ({ fecha: h.date, nombre: h.localName || h.name }))
    : [];
  __feriadosCache[year] = normalizado;
  console.log('[Feriados] fuente: Nager', year, normalizado.length);
  return normalizado;
}


function __findHoliday(dateObj, feriados) {
  const ymd = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
  return feriados.find(h => (h.fecha || h.date) === ymd);
}

async function markHolidaysInView() {
  const start = getStartOfWeek(currentDate);
  const year = start.getFullYear();
  let feriados = [];
  try { feriados = await fetchFeriados(year); } catch { feriados = []; }

  const headers = document.querySelectorAll('.calendar-header .day-column'); // 6 columnas (Lu–Sa)
  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const fer = __findHoliday(d, feriados);
    const headerCol = headers[i];
    if (!headerCol) continue;

    // limpia estado anterior
    headerCol.classList.remove('holiday');
    headerCol.removeAttribute('title');
    const badgeOld = headerCol.querySelector('.holiday-badge');
    if (badgeOld) badgeOld.remove();
    document.querySelectorAll(`.day-cell[data-day="${i}"]`).forEach(c => {
      c.classList.remove('holiday');
      delete c.dataset.holiday;
    });

    if (fer) {
      headerCol.classList.add('holiday');
      headerCol.title = fer.nombre || 'Feriado';
      const badge = document.createElement('span');
      badge.className = 'holiday-badge';
      badge.textContent = 'Feriado';
      headerCol.appendChild(badge);

      // desactivar visualmente los slots del día
      document.querySelectorAll(`.day-cell[data-day="${i}"]`).forEach(c => {
        c.classList.add('holiday');
        c.dataset.holiday = '1';
      });
    }
  }
}




    // =============================================
    // GENERACIÓN DE HORARIOS
    // =============================================
    function generateTimeSlots() {
        timeSlotsContainer.innerHTML = '';
        const startOfWeek = getStartOfWeek(currentDate);

        for (let hour = 8; hour < 20; hour++) {
            for (let minutes = 0; minutes < 60; minutes += 30) {
                const row = document.createElement('div');
                row.className = 'time-slot';

                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';
                timeLabel.textContent = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                row.appendChild(timeLabel);

                for (let i = 0; i < 6; i++) {
                    const cell = document.createElement('div');
                    cell.className = 'day-cell';
                    cell.dataset.day = i;
                    cell.dataset.time = `${hour}:${minutes}`;

                    const slotDate = new Date(startOfWeek);
                    slotDate.setDate(slotDate.getDate() + i);
                    slotDate.setHours(hour, minutes, 0, 0);

                    cell.addEventListener('click', () => handleTimeSlotClick(cell, slotDate));
                    row.appendChild(cell);
                }

                timeSlotsContainer.appendChild(row);
            }
        }
    }

    // =============================================
    // MANEJO DE INTERACCIÓN CON HORARIOS
    // =============================================
function handleTimeSlotClick(cell, date) {
    // Validar si es feriado
    if (cell.classList.contains('holiday') || cell.dataset.holiday === '1') {
        showFeedbackMessage('Día feriado: no disponible', 'error');
        return;
    }
    
    const appointment = appointments.find(app => new Date(app.date).getTime() === date.getTime());
    const isBlocked = blockedSlots.some(b => date >= new Date(b.inicio) && date < new Date(b.fin));

    if (appointment) {
        showAppointmentDetails(appointment);
    } else {
        toggleSlotSelection(cell, date);
    }
}

    function toggleSlotSelection(cell, date) {
        const existing = selectedSlots.find(s => s.cell === cell);
        if (existing) {
            selectedSlots = selectedSlots.filter(s => s.cell !== cell);
            cell.classList.remove('selected');
        } else {
            selectedSlots.push({ cell, date });
            cell.classList.add('selected');
        }
        updateButtonStates();
    }

    function updateButtonStates() {
        const hasSelection = selectedSlots.length > 0;
        const blockedCount = selectedSlots.filter(s => s.cell.classList.contains('blocked')).length;

        blockTimeButton.textContent = hasSelection ? `Reservar (${selectedSlots.length})` : 'Reservar Horario';
        blockTimeButton.classList.toggle('btn-highlight', hasSelection);

        refreshButton.textContent = blockedCount > 0 ? `Liberar (${blockedCount})` : 'Liberar Horario';
        refreshButton.classList.toggle('btn-warning-highlight', blockedCount > 0);
    }

// =============================================
// FUNCIÓN AUXILIAR PARA LIMPIAR SELECCIÓN
// =============================================
function clearSelection() {
    selectedSlots.forEach(s => s.cell.classList.remove('selected'));
    selectedSlots = [];
    updateButtonStates();
}
// expone la misma función al ámbito global por si alguien la llama desde fuera
window.clearSelection = clearSelection;


    // =============================================
// FUNCIONES DE RESERVA Y LIBERACIÓN DE HORARIOS
// =============================================
function reserveSelectedSlots() {
    if (!confirm(`¿Reservar ${selectedSlots.length} horario(s)?`)) return;

    const bloques = selectedSlots.map(s => ({
        inicio: new Date(s.date).toISOString(),
        fin: new Date(s.date.getTime() + 30 * 60000).toISOString(),
        motivo: 'Reserva rápida'
    }));

    fetch('/medico/api/bloqueos/crear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ bloques })
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al reservar horarios');
            return response.json();
        })
        .then(data => {
    showFeedbackMessage('Horarios reservados correctamente', 'success');
    loadBlockedSlots();
    // limpiar selección sin depender de clearSelection()
    selectedSlots.forEach(s => s.cell.classList.remove('selected'));
    selectedSlots = [];
    updateButtonStates();
})

        .catch(error => {
            console.error('Error al reservar horarios:', error);
            showFeedbackMessage('Error al reservar horarios', 'error');
        });
}

function freeSelectedSlots() {
    const slotsToFree = selectedSlots.filter(s => s.cell.classList.contains('blocked'));

    if (slotsToFree.length === 0) {
        showFeedbackMessage('Selecciona horarios reservados para liberar', 'error');
        return;
    }

    if (!confirm(`¿Liberar ${slotsToFree.length} horario(s)?`)) return;

    const fechas = slotsToFree.map(s => new Date(s.date).toISOString());

    fetch('/medico/api/bloqueos/eliminar/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ fechas })
    })
        .then(response => {
            if (!response.ok) throw new Error('Error al liberar horarios');
            return response.json();
        })
        .then(data => {
    showFeedbackMessage('Horarios liberados correctamente', 'success');
    loadBlockedSlots();
    // limpiar selección sin depender de clearSelection()
    selectedSlots.forEach(s => s.cell.classList.remove('selected'));
    selectedSlots = [];
    updateButtonStates();
})
        .catch(error => {
            console.error('Error al liberar horarios:', error);
            showFeedbackMessage('Error al liberar horarios', 'error');
        });
}

// =============================================
// MANEJO DE CITAS MÉDICAS
// =============================================
function loadAppointments() {
    const startDate = getStartOfWeek(currentDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    fetch('/medico/api/citas/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            inicio: startDate.toISOString(),
            fin: endDate.toISOString()
        })
    })
    .then(response => {
        if (!response.ok) throw new Error("Error al obtener citas");
        return response.json();
    })
    .then(data => {
        appointments = data.map(cita => ({
            id: cita.id,
            patientId: cita.paciente_id,
            patientName: cita.paciente_nombre,
            date: new Date(cita.fecha_hora),
            reason: cita.motivo,
            status: cita.estado,
            notes: cita.notas
        }));
        renderAppointments();
    })
    .catch(error => {
        console.error("Error al cargar citas:", error);
        showFeedbackMessage('Error al cargar citas', 'error');
    });
}

    function renderAppointments() {
        document.querySelectorAll('.day-cell.appointment').forEach(c => {
            c.classList.remove('appointment');
            c.innerHTML = '';
        });

        const startOfWeek = getStartOfWeek(currentDate);

        appointments.forEach(app => {
            const date = new Date(app.date);
            if (date < startOfWeek || date >= new Date(startOfWeek.getTime() + 7 * 86400000)) return;

            const jsDay = date.getDay();
            const day = jsDay === 0 ? null : jsDay - 1;
            if (day === null || day >= 6) return;

            const hour = date.getHours();
            const minutes = date.getMinutes();
            const cells = document.querySelectorAll(`.day-cell[data-day="${day}"][data-time="${hour}:${minutes}"]`);

            cells.forEach(cell => {
                cell.classList.add('appointment');
                cell.innerHTML = `
                    <div class="appointment-badge">
                        <span>${app.patientName.split(' ')[0]}</span>
                        <small>${app.reason.substring(0, 15)}${app.reason.length > 15 ? '...' : ''}</small>
                    </div>`;
            });
        });
    }

// =============================================
// CARGA DE BLOQUEOS (SEMANA ACTUAL)
// =============================================
function loadBlockedSlots() {
    const startDate = getStartOfWeek(currentDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    fetch(`/medico/api/bloqueos/?inicio=${startDate.toISOString()}&fin=${endDate.toISOString()}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar bloqueos');
            return response.json();
        })
        .then(data => {
            // El backend devuelve [{inicio, fin, motivo}]
            blockedSlots = data;
            renderBlockedSlots();
        })
        .catch(error => {
            console.error('Error al cargar bloqueos:', error);
            showFeedbackMessage('Error al cargar bloqueos', 'error');
        });
}


// =============================================
// MANEJO DE HORARIOS BLOQUEADOS
// =============================================
function renderBlockedSlots() {
    // Limpia bloqueos anteriores
    document.querySelectorAll('.day-cell.blocked').forEach(c => {
        c.classList.remove('blocked');
        if (!c.classList.contains('appointment')) c.innerHTML = '';
    });

    const startOfWeek = getStartOfWeek(currentDate);

    blockedSlots.forEach(block => {
        // Soporta claves inicio/fin o start/end
        let current = new Date(block.inicio || block.start);
        const end = new Date(block.fin || block.end);

        while (current < end) {
            const jsDay = current.getDay();
            const day = jsDay === 0 ? null : jsDay - 1;
            if (day !== null && day < 6) {
                const hour = current.getHours();
                const minutes = current.getMinutes();
                const cells = document.querySelectorAll(`.day-cell[data-day="${day}"][data-time="${hour}:${minutes}"]`);

                cells.forEach(cell => {
                    if (!cell.classList.contains('appointment')) {
                        cell.classList.add('blocked');
                        cell.innerHTML = '<div class="blocked-badge">Reservado</div>';
                    }
                });
            }
            current.setMinutes(current.getMinutes() + 30);
        }
    });
}

// =============================================
// FUNCIONES DEL MODAL DE CITAS
// =============================================
function showAppointmentDetails(app) {
    appointmentDetails.innerHTML = `
        <p><strong>Paciente:</strong> ${app.patientName || ''}</p>
        <p><strong>Fecha:</strong> ${new Date(app.date).toLocaleString('es-ES')}</p>
        <p><strong>Motivo:</strong> ${app.reason || ''}</p>
        <p><strong>Estado:</strong> ${app.status || ''}</p>
        ${app.notes ? `<p><strong>Notas:</strong> ${app.notes}</p>` : ''}`;
    viewPatientButton.dataset.pacienteId = app.patientId;
    cancelAppointmentButton.dataset.citaId = app.id;
    appointmentModal.style.display = 'block';
}

   // =============================================
// MODAL DE BLOQUEO (apertura sencilla)
// =============================================
function openBlockModal() {
  blockModal.style.display = 'block';
}

    // =============================================
    // FUNCIONES AUXILIARES
    // =============================================
    function showFeedbackMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `feedback-message feedback-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeInOut 3s ease-in-out';
            setTimeout(() => document.body.removeChild(toast), 3000);
        }, 0);
    }

// =============================================
// MANEJADOR DEL FORMULARIO DE BLOQUEO
// =============================================
blockForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const date = document.getElementById('block-date').value;
    const start = document.getElementById('block-start').value;
    const end = document.getElementById('block-end').value;
    const reason = document.getElementById('block-reason').value;

    const dStart = new Date(`${date}T${start}`);
    const dEnd = new Date(`${date}T${end}`);

    if (dEnd <= dStart) {
        alert('La hora de fin debe ser posterior a la hora de inicio');
        return;
    }

    const bloqueo = {
        inicio: dStart.toISOString(),
        fin: dEnd.toISOString(),
        motivo: reason || 'Bloqueo manual'
    };

    fetch('/medico/api/bloquear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(bloqueo)
    })
    .then(response => {
        if (!response.ok) throw new Error("Error al guardar bloqueo");
        return response.json();
    })
        .then(data => {
        showFeedbackMessage('Horario bloqueado exitosamente', 'success');
        blockModal.style.display = 'none';
        loadBlockedSlots();  // Recarga los bloqueos desde la BD
    })
    .catch(error => {
        console.error("Error al bloquear:", error);
        showFeedbackMessage('Error al bloquear horario', 'error');
    });
});

// =============================================
// PLACEHOLDER: PERFIL DEL PACIENTE
// =============================================
function viewPatientProfile(pacienteId) {
    console.log("Ver perfil de paciente:", pacienteId);
    alert("Funcionalidad 'Ver Paciente' aún no implementada.");
}

// =============================================
// PLACEHOLDER: CANCELAR CITA
// =============================================
function cancelAppointment() {
    console.log("Funcionalidad 'Cancelar Cita' aún no implementada.");
    alert("Cancelar cita todavía no está disponible.");
}

// =============================================
// PLACEHOLDER: MENSAJES DE FEEDBACK
// =============================================
function showFeedbackMessage(message, type) {
    console.log("FEEDBACK:", type, message);
    alert(message);  // muestra un popup simple en el navegador
}

});


