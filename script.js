window.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. CONFIGURAÇÃO ABLY ---
    const ABLY_KEY = "zfqwdA.QY0KxQ:_RQcTI6NCeRMNnLLyC8Ebb6Lg50xnDlcwvRv4wQ3H5o";
    const ably = new Ably.Realtime({ key: ABLY_KEY });
    const channel = ably.channels.get('chat-geral');

    // --- 1. CANVAS DE PARTÍCULAS (PLEXUS) ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const maxParticles = 60;
    const connectionDistance = 110;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }
    for (let i = 0; i < maxParticles; i++) particles.push(new Particle());

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
            ctx.beginPath(); ctx.arc(particles[i].x, particles[i].y, 2, 0, Math.PI * 2); ctx.fill();
            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectionDistance) {
                    let alpha = (1 - (dist / connectionDistance)) * 0.15;
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // --- 2. PARALLAX 3D ---
    const card = document.getElementById('login-card');
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    window.addEventListener('mousemove', (e) => {
        targetX = ((e.clientY / window.innerHeight) - 0.5) * 20;
        targetY = ((e.clientX / window.innerWidth) - 0.5) * -20;
    });
    function loopParallax() {
        curX += (targetX - curX) * 0.1;
        curY += (targetY - curY) * 0.1;
        card.style.transform = `rotateX(${curX}deg) rotateY(${curY}deg)`;
        requestAnimationFrame(loopParallax);
    }
    loopParallax();

    // --- 3. LÓGICA DE PRESENÇA (ABLY) ---
    const contactList = document.querySelector('.contact-list');

    function renderMember(member) {
        if (!member.data || !member.data.username) return;
        const existing = document.getElementById('m-' + member.clientId);
        if (existing) existing.remove();

        const div = document.createElement('div');
        div.className = 'contact-item';
        div.id = 'm-' + member.clientId;
        div.textContent = member.data.username;
        contactList.appendChild(div);
    }

    function iniciarPresenca(username) {
        channel.presence.enter({ username: username });

        channel.presence.subscribe('enter', (member) => renderMember(member));
        channel.presence.subscribe('leave', (member) => {
            const el = document.getElementById('m-' + member.clientId);
            if (el) el.remove();
        });

        channel.presence.get((err, members) => {
            if (!err) members.forEach(m => renderMember(m));
        });
    }

    // --- 4. FORMULÁRIO E TRANSIÇÃO ---
    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const btnSubmit = document.getElementById('btn-submit');
    const appWrapper = document.getElementById('app-wrapper');

    usernameInput.addEventListener('input', () => {
        document.querySelector('.input-icon').classList.toggle('is-typing', usernameInput.value.length > 0);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (!username) return;

        btnSubmit.disabled = true;
        btnSubmit.querySelector('span').textContent = 'Conectando...';
        card.classList.add('fade-out');

        setTimeout(() => {
            card.style.display = 'none';
            appWrapper.style.display = 'flex';
            
            requestAnimationFrame(() => {
                appWrapper.style.opacity = '1';
                iniciarPresenca(username);
            });
        }, 500);
    });
});
