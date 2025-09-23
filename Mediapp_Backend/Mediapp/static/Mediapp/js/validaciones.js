// ================== VALIDACIONES BÁSICAS ==================
const validarRUT = (rut) => {
    if (!rut) return false;
    rut = rut.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toUpperCase();
    if (!/^\d+[0-9K]$/.test(rut)) return false;

    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    let suma = 0, multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
    return dv === dvCalculado;
};

// Reglas: mínimo 8, al menos 1 mayúscula, 1 número y 1 carácter especial
const validarPassword = (password) => {
  if (typeof password !== 'string') return false;
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasMinLength && hasUpper && hasNumber && hasSpecial;
};


const validarEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ================== FORMULARIO DE REGISTRO ==================
const configurarRegistro = () => {
    const form = document.getElementById('registro-form');
    if (!form) return;

    const tipoUsuario = document.getElementById('tipoUsuario');
    const especialidad = document.getElementById('especialidadContainer');
    const codigoAdmin = document.getElementById('codigoAdminContainer');

    tipoUsuario.addEventListener('change', () => {
        especialidad.classList.toggle('d-none', tipoUsuario.value !== 'medico');
        codigoAdmin.classList.toggle('d-none', tipoUsuario.value !== 'admin');
    });

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valido = true;

    // helpers para feedback (Bootstrap)
    const setInvalid = (el, msg) => {
        if (!el) return;
        el.classList.add('is-invalid');
        let fb = el.parentElement.querySelector('.invalid-feedback');
        if (!fb) {
            fb = document.createElement('div');
            fb.className = 'invalid-feedback';
            el.parentElement.appendChild(fb);
        }
        fb.textContent = msg;
    };
    const clearInvalid = (el) => {
        if (!el) return;
        el.classList.remove('is-invalid');
        const fb = el.parentElement.querySelector('.invalid-feedback');
        if (fb) fb.textContent = '';
    };

    // refs
    const rut = form.rut;
    const email = form.email;
    const pass = form.password;
    const confirm = form.confirmPassword;
    const tipoUsuario = document.getElementById('tipoUsuario') || form.tipoUsuario;

    // limpiar estados previos
    [rut, email, pass, confirm, form.especialidad, form.codigoAdmin].forEach(clearInvalid);

    // Validar RUT
    if (!validarRUT(rut.value.trim())) {
        setInvalid(rut, 'RUT inválido.');
        valido = false;
    }

    // Validar email
    if (!validarEmail(email.value.trim())) {
        setInvalid(email, 'Ingresa un correo válido.');
        valido = false;
    }

    // Validar contraseña (8+, 1 mayúscula, 1 número y 1 carácter especial)
    if (!validarPassword(pass.value)) {
        setInvalid(pass, 'Debe tener 8+ caracteres, 1 mayúscula, 1 número y 1 carácter especial.');
        valido = false;
    }

    // Confirmar contraseña
    if (pass.value !== confirm.value || !confirm.value) {
        setInvalid(confirm, 'Las contraseñas no coinciden.');
        valido = false;
    }

    // Campos según tipo de usuario
    if (tipoUsuario && tipoUsuario.value === 'medico' && !form.especialidad.value) {
        setInvalid(form.especialidad, 'Selecciona una especialidad.');
        valido = false;
    }
    if (tipoUsuario && tipoUsuario.value === 'admin' && !form.codigoAdmin.value) {
        setInvalid(form.codigoAdmin, 'Ingresa el código de administrador.');
        valido = false;
    }

    if (!valido) return;

    const formData = new FormData(form);

    try {
        const response = await fetch('/api/registro/', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            if (data.tipo_usuario === 'paciente') {
                window.location.href = APP_ROUTES.paciente.reservas;
            } else if (data.tipo_usuario === 'medico') {
                window.location.href = APP_ROUTES.medico.agenda;
            } else if (data.tipo_usuario === 'admin') {
                window.location.href = APP_ROUTES.admin.dashboard;
            }
        } else {
            alert(data.message || 'Error en el registro');
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Hubo un error en el registro.");
    }
});

};

// ================== FORMULARIO DE LOGIN ==================
const configurarLogin = () => {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        let valido = true;

        if (!validarEmail(form.email.value.trim())) {
            form.email.classList.add('is-invalid');
            valido = false;
        }

        if (!form.password.value) {
            form.password.classList.add('is-invalid');
            valido = false;
        }

        if (!valido) {
            e.preventDefault();
        }
    });
};

// ================== FORMULARIO DE RECUPERAR ==================
const configurarRecuperacion = () => {
    const form = document.querySelector('form[action*="password_reset"]');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput) {
        form.addEventListener('submit', (e) => {
            if (!validarEmail(emailInput.value.trim())) {
                emailInput.classList.add('is-invalid');
                e.preventDefault();
            }
        });
    }
};

// ================== LIMPIEZA DINÁMICA ==================
document.addEventListener('DOMContentLoaded', () => {
    configurarRegistro();
    configurarLogin();
    configurarRecuperacion();

    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
        });
    });
});
