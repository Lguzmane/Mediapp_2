document.addEventListener('DOMContentLoaded', function () {
    const BASE_URL = window.location.origin;

    // ✅ FUNCIÓN UTILITARIA PARA OBTENER CSRF DESDE COOKIE
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const loadComponent = async (templateName, containerId) => {
        try {
            const response = await fetch(`${BASE_URL}/component/${templateName}/`);
            if (!response.ok) throw new Error(`Error al cargar ${templateName}`);
            const html = await response.text();

            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
                if (containerId === 'header-container') {
                    renderUserMenu();
                }
            }
        } catch (error) {
            console.error(`Error loading ${templateName}:`, error);

            const staticPath = `/static/Mediapp/components/${templateName}.html`;
            try {
                const staticResponse = await fetch(staticPath);
                if (!staticResponse.ok) throw new Error(`Error al cargar ${staticPath}`);
                const staticHtml = await staticResponse.text();

                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = staticHtml;
                    if (containerId === 'header-container') {
                        renderUserMenu();
                    }
                }
            } catch (staticError) {
                console.error(`Error loading static ${templateName}:`, staticError);
                renderFallbackHeader(containerId);
            }
        }
    };

    // ✅ CORREGIDO: USA CSRF DESDE COOKIE
    const setupHeaderEvents = () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch(`${BASE_URL}/logout/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        credentials: 'include'
                    });
                    if (response.ok) {
                        window.location.href = `${BASE_URL}/login/`;
                    } else {
                        console.error('Error en logout:', response.status);
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = `${BASE_URL}/login/`;
                }
            });
        }
    };

    const renderUserMenu = async () => {
        const navSession = document.getElementById('nav-session');
        if (!navSession) return;

        try {
            const response = await fetch('/check-session/', {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();

            navSession.innerHTML = '';

            if (data.is_authenticated && data.nombre) {
                navSession.innerHTML = `
                    <li class="nav-item me-2">
                        <span class="nav-link disabled">Hola, ${data.nombre.split(' ')[0]}</span>
                    </li>
                    <li class="nav-item">
                        <a href="#" class="nav-link text-warning" id="logoutBtn">
                            <i class="bi bi-box-arrow-right me-1"></i>Salir
                        </a>
                    </li>
                `;
                setupHeaderEvents();
            } else {
                navSession.innerHTML = `
                    <li class="nav-item">
                        <a href="/login/" class="nav-link text-white">Iniciar sesión</a>
                    </li>
                `;
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
        }
    };

    const renderFallbackHeader = (containerId) => {
        if (containerId === 'header-container') {
            document.getElementById(containerId).innerHTML = `
                <nav class="navbar navbar-dark bg-primary">
                    <div class="container">
                        <a class="navbar-brand" href="/">MediApp</a>
                        <ul class="navbar-nav" id="nav-session"></ul>
                    </div>
                </nav>`;
            renderUserMenu();
        } else if (containerId === 'footer-container') {
            document.getElementById(containerId).innerHTML = `
                <footer class="bg-dark text-white py-4 mt-5">
                    <div class="container text-center">
                        <p class="mb-0">© ${new Date().getFullYear()} MediApp - Todos los derechos reservados</p>
                    </div>
                </footer>`;
        }
    };

    loadComponent('header', 'header-container');
    loadComponent('footer', 'footer-container');
});
