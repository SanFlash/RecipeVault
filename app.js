/**
 * RecipeVault - Core Application Logic
 * Premium Vanilla JS Implementation
 */

// --- CONFIG & STATE ---
const STATE = {
    recipes: [],
    filters: {
        category: 'all',
        search: ''
    },
    isDarkMode: true,
    currentImages: [],
    isAuthenticated: sessionStorage.getItem('vault_admin') === 'true'
};

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Healthy'];

// --- SECURITY MANAGER ---
const S = {
    checkAuth() {
        const isLanding = window.location.pathname.includes('landing.html');
        if (isLanding) return true;

        if (STATE.isAuthenticated) {
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.classList.remove('active');
            return true;
        } else {
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.classList.add('active');
            return false;
        }
    },
    login() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        console.log('Attempting login with:', user, pass); // Debug log

        if (user === 'admin' && pass === '12345') {
            STATE.isAuthenticated = true;
            sessionStorage.setItem('vault_admin', 'true');
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.classList.remove('active');
            UI.renderRecipes(false);
            UI.showToast('Welcome back, Chef!');
            console.log('Login successful');
        } else {
            alert('Invalid credentials');
        }
    },
    logout() {
        sessionStorage.removeItem('vault_admin');
        STATE.isAuthenticated = false;
        window.location.reload();
    }
};

// --- THREE.JS BACKGROUND ---
class ThreeScene {
    constructor() {
        this.container = document.getElementById('canvas-container');
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.particles = null;
        this.init();
        this.animate();

        window.addEventListener('resize', () => this.onResize());
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 2000; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000),
                THREE.MathUtils.randFloatSpread(2000)
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
            color: 0x833ab4,
            size: 2,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        this.camera.position.z = 500;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.particles) {
            this.particles.rotation.x += 0.0005;
            this.particles.rotation.y += 0.0005;
        }
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- STORAGE MANAGER ---
const Storage = {
    KEY: 'recipevault_data',
    save(recipes) {
        localStorage.setItem(this.KEY, JSON.stringify(recipes));
    },
    load() {
        const raw = localStorage.getItem(this.KEY);
        let data = raw ? JSON.parse(raw) : this.getSeedData();
        // Ensure all recipes have isVisible property
        return data.map(r => ({ ...r, isVisible: r.isVisible !== undefined ? r.isVisible : true }));
    },
    getSeedData() {
        return [
            {
                id: 1,
                title: 'Sunset Berry Galette',
                category: 'Dessert',
                ingredients: ['2 cups Blueberries', '1 cup Raspberries', '1/2 cup Sugar', 'Pastry dough'],
                steps: ['Prepare the dough', 'Mix berries with sugar', 'Fold edges', 'Bake at 375F for 40m'],
                images: ['https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&q=80&w=800'],
                favorite: true,
                isVisible: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Truffle Mushroom Risotto',
                category: 'Dinner',
                ingredients: ['Arborio rice', 'Wild mushrooms', 'Truffle oil', 'Parmesan', 'Veg stock'],
                steps: ['Sauté mushrooms', 'Toast rice', 'Add stock slowly', 'Finish with truffle oil'],
                images: ['https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=800'],
                favorite: false,
                isVisible: true,
                createdAt: new Date().toISOString()
            }
        ];
    }
};

// --- UI MANAGER ---
const UI = {
    elements: {
        grid: document.getElementById('recipe-grid'),
        search: document.getElementById('search-input'),
        adminPanel: document.getElementById('admin-panel'),
        recipeForm: document.getElementById('recipe-form'),
        imagePreviews: document.getElementById('image-previews'),
        modal: document.getElementById('recipe-modal'),
        modalBody: document.getElementById('modal-details'),
        themeBtn: document.getElementById('theme-toggle'),
        aiModal: document.getElementById('ai-modal')
    },

    init() {
        const isLanding = window.location.pathname.includes('landing.html');

        // Setup event listeners first so login button works
        this.setupEventListeners(isLanding);

        if (!isLanding) {
            if (!S.checkAuth()) return;
        }

        this.renderRecipes(isLanding);
        this.setupTiltEffect();
    },

    renderRecipes(isLanding = false) {
        if (!this.elements.grid) {
            console.warn('Grid element not found');
            return;
        }

        let filtered = STATE.recipes.filter(r => {
            const matchesSearch = r.title.toLowerCase().includes(STATE.filters.search.toLowerCase()) ||
                r.ingredients.some(i => i.toLowerCase().includes(STATE.filters.search.toLowerCase()));
            const matchesCat = STATE.filters.category === 'all' || r.category === STATE.filters.category;
            return matchesSearch && matchesCat;
        });

        if (isLanding) {
            filtered = filtered.filter(r => r.isVisible);
        }

        this.elements.grid.innerHTML = filtered.length ? '' : '<div class="no-results">No culinary wonders found...</div>';

        filtered.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.setAttribute('data-id', recipe.id);

            const adminActions = !isLanding ? `
                <div class="card-actions">
                    <button class="btn-card-action ${recipe.isVisible ? 'active' : 'hidden-recipe'}" onclick="UI.toggleVisibility(event, ${recipe.id})" title="Toggle Visibility">
                        <i class="fas fa-${recipe.isVisible ? 'eye' : 'eye-slash'}"></i>
                    </button>
                    <button class="btn-card-action" onclick="UI.editRecipe(event, ${recipe.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-card-action" onclick="UI.deleteRecipe(event, ${recipe.id})"><i class="fas fa-trash"></i></button>
                </div>
            ` : '';

            card.innerHTML = `
                <div class="card-image-wrap">
                    <div class="card-badge">${recipe.category}</div>
                    ${isLanding ? `
                    <button class="card-fav ${recipe.favorite ? 'active' : ''}" onclick="UI.toggleFavorite(event, ${recipe.id})">
                        <i class="${recipe.favorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>` : `
                    <div class="visibility-status ${recipe.isVisible ? 'visible' : 'hidden'}">
                        ${recipe.isVisible ? 'LIVE' : 'HIDDEN'}
                    </div>
                    `}
                    <div class="card-slideshow" id="slide-${recipe.id}">
                        ${recipe.images.map(img => `<img src="${img}" alt="${recipe.title}">`).join('')}
                    </div>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${recipe.title}</h3>
                    <div class="card-tags">
                        ${recipe.ingredients.slice(0, 3).map(ing => `<span class="tag">${ing}</span>`).join('')}
                    </div>
                    <div class="card-footer">
                        ${adminActions}
                        <span class="btn-card-action"><i class="fas fa-chevron-right"></i></span>
                    </div>
                </div>
            `;

            card.onclick = (e) => {
                if (!e.target.closest('.card-fav') && !e.target.closest('.btn-card-action')) {
                    UI.openDetail(recipe);
                }
            };

            this.elements.grid.appendChild(card);
            this.initCardSlider(recipe.id);
        });
    },

    initCardSlider(id) {
        const slider = document.getElementById(`slide-${id}`);
        if (!slider || slider.children.length <= 1) return;

        let index = 0;
        const interval = setInterval(() => {
            const el = document.getElementById(`slide-${id}`);
            if (!el) { clearInterval(interval); return; }
            index = (index + 1) % el.children.length;
            el.style.transform = `translateX(-${index * 100}%)`;
        }, 3000 + Math.random() * 2000);
    },

    setupTiltEffect() {
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.recipe-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (centerY - y) / 15;
                    const rotateY = (x - centerX) / 15;
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                } else {
                    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                }
            });
        });
    },

    setupEventListeners(isLanding) {
        // Search
        if (this.elements.search) {
            this.elements.search.addEventListener('input', (e) => {
                STATE.filters.search = e.target.value;
                this.renderRecipes(isLanding);
            });
        }

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                STATE.filters.category = btn.dataset.category;
                this.renderRecipes(isLanding);
            });
        });

        // Toggle Admin Panel
        const adminToggle = document.getElementById('admin-toggle-btn');
        if (adminToggle) {
            adminToggle.onclick = () => {
                this.elements.adminPanel.classList.add('open');
                this.resetForm();
            };
        }

        const closeAdmin = document.getElementById('close-admin');
        if (closeAdmin) {
            closeAdmin.onclick = () => {
                this.elements.adminPanel.classList.remove('open');
            };
        }

        // Theme Toggle
        if (this.elements.themeBtn) {
            this.elements.themeBtn.onclick = () => {
                STATE.isDarkMode = !STATE.isDarkMode;
                document.body.className = STATE.isDarkMode ? 'dark-theme' : 'light-theme';
                this.elements.themeBtn.innerHTML = STATE.isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            };
        }

        // Recipe Form
        if (this.elements.recipeForm) {
            this.elements.recipeForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            };
        }

        // Image Upload
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('recipe-images');

        if (dropZone && fileInput) {
            dropZone.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleImageUpload(e.target.files);

            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-neon)'; };
            dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--glass-border)'; };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                this.handleImageUpload(e.dataTransfer.files);
            };
        }

        // Modal closures
        const closeModal = document.getElementById('close-modal');
        if (closeModal) closeModal.onclick = () => this.elements.modal.classList.remove('open');

        const closeAi = document.getElementById('close-ai');
        if (closeAi) closeAi.onclick = () => this.elements.aiModal.classList.remove('open');

        // AI Generate
        const aiBtn = document.getElementById('ai-generate-btn');
        if (aiBtn) aiBtn.onclick = () => this.generateAIRecipe();

        // Login Logic - IMPORTANT: Attach directly
        const submitLogin = document.getElementById('submit-login');
        if (submitLogin) {
            submitLogin.onclick = () => S.login();
        }

        // Allow Enter key for login
        const loginPass = document.getElementById('login-pass');
        if (loginPass) {
            loginPass.onkeydown = (e) => {
                if (e.key === 'Enter') S.login();
            };
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.onclick = () => S.logout();
    },

    handleImageUpload(files) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                STATE.currentImages.push(base64);
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    },

    renderImagePreviews() {
        if (this.elements.imagePreviews) {
            this.elements.imagePreviews.innerHTML = STATE.currentImages.map(img =>
                `<img src="${img}" class="preview-img">`
            ).join('');
        }
    },

    handleFormSubmit() {
        const id = document.getElementById('edit-id').value;
        const recipe = {
            id: id ? parseInt(id) : Date.now(),
            title: document.getElementById('recipe-title').value,
            category: document.getElementById('recipe-category').value,
            ingredients: document.getElementById('recipe-ingredients').value.split('\n').filter(i => i.trim()),
            steps: document.getElementById('recipe-steps').value.split('\n').filter(i => i.trim()),
            images: STATE.currentImages.length ? STATE.currentImages : ['https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800'],
            favorite: false,
            isVisible: true,
            createdAt: new Date().toISOString()
        };

        if (id) {
            const idx = STATE.recipes.findIndex(r => r.id === parseInt(id));
            recipe.favorite = STATE.recipes[idx].favorite;
            recipe.isVisible = STATE.recipes[idx].isVisible;
            STATE.recipes[idx] = recipe;
            this.showToast('Recipe updated successfully!');
        } else {
            STATE.recipes.unshift(recipe);
            this.showToast('New recipe added to your vault!');
        }

        Storage.save(STATE.recipes);
        this.renderRecipes(false);
        this.elements.adminPanel.classList.remove('open');
        this.resetForm();
    },

    toggleVisibility(e, id) {
        e.stopPropagation();
        const recipe = STATE.recipes.find(r => r.id === id);
        if (recipe) {
            recipe.isVisible = !recipe.isVisible;
            Storage.save(STATE.recipes);
            this.renderRecipes(false);
            this.showToast(recipe.isVisible ? 'Recipe is now visible to public' : 'Recipe is now hidden from public');
        }
    },

    resetForm() {
        if (!this.elements.recipeForm) return;
        this.elements.recipeForm.reset();
        document.getElementById('edit-id').value = '';
        STATE.currentImages = [];
        this.elements.imagePreviews.innerHTML = '';
        document.getElementById('submit-btn').innerText = 'Save Recipe';
    },

    toggleFavorite(e, id) {
        e.stopPropagation();
        const recipe = STATE.recipes.find(r => r.id === id);
        if (recipe) {
            recipe.favorite = !recipe.favorite;
            Storage.save(STATE.recipes);
            this.renderRecipes(true);
        }
    },

    editRecipe(e, id) {
        e.stopPropagation();
        const recipe = STATE.recipes.find(r => r.id === id);
        if (!recipe) return;

        document.getElementById('edit-id').value = recipe.id;
        document.getElementById('recipe-title').value = recipe.title;
        document.getElementById('recipe-category').value = recipe.category;
        document.getElementById('recipe-ingredients').value = recipe.ingredients.join('\n');
        document.getElementById('recipe-steps').value = recipe.steps.join('\n');
        STATE.currentImages = [...recipe.images];
        this.renderImagePreviews();

        document.getElementById('submit-btn').innerText = 'Update Recipe';
        this.elements.adminPanel.classList.add('open');
    },

    deleteRecipe(e, id) {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this culinary masterpiece?')) {
            STATE.recipes = STATE.recipes.filter(r => r.id !== id);
            Storage.save(STATE.recipes);
            this.renderRecipes(false);
            this.showToast('Recipe deleted.');
        }
    },

    openDetail(recipe) {
        if (!this.elements.modalBody) return;
        this.elements.modalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-gallery">
                    <img src="${recipe.images[0]}" id="main-modal-img">
                </div>
                <div class="detail-info">
                    <div class="tag">${recipe.category}</div>
                    <h1>${recipe.title}</h1>
                    
                    <h2 class="section-title">Ingredients</h2>
                    <ul class="ingredients-list">
                        ${recipe.ingredients.map(ing => `<li><i class="fas fa-check-circle" style="color:var(--accent-neon)"></i> ${ing}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <h2 class="section-title">Preparation Steps</h2>
            <ul class="steps-list">
                ${recipe.steps.map((step, i) => `<li data-step="${i + 1}">${step}</li>`).join('')}
            </ul>
        `;
        this.elements.modal.classList.add('open');
    },

    generateAIRecipe() {
        this.elements.aiModal.classList.add('open');
        const loader = document.getElementById('ai-loader');
        const result = document.getElementById('ai-result');
        if (loader) loader.classList.remove('hidden');
        if (result) result.classList.add('hidden');

        setTimeout(() => {
            const templates = [
                {
                    title: 'Neon Glazed Salmon',
                    category: 'Healthy',
                    ingredients: ['Fresh Salmon', 'Miso Paste', 'Honey', 'Bok Choy', 'Ginger'],
                    steps: ['Marinate salmon in miso and honey', 'Sear for 4 mins per side', 'Steam bok choy', 'Garnish with ginger'],
                    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800'
                },
                {
                    title: 'Cyberpunk Smoothie Bowl',
                    category: 'Breakfast',
                    ingredients: ['Pitaya', 'Frozen Banana', 'Hemp Seeds', 'Edible Flowers'],
                    steps: ['Blend pitaya and banana', 'Pour into chilled bowl', 'Topping with seeds and flowers'],
                    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=800'
                }
            ];

            const selected = templates[Math.floor(Math.random() * templates.length)];

            if (loader) loader.classList.add('hidden');
            if (result) {
                result.classList.remove('hidden');
                document.getElementById('ai-gen-title').innerText = selected.title;
            }

            this.elements.adminPanel.classList.add('open');
            document.getElementById('recipe-title').value = selected.title;
            document.getElementById('recipe-category').value = selected.category;
            document.getElementById('recipe-ingredients').value = selected.ingredients.join('\n');
            document.getElementById('recipe-steps').value = selected.steps.join('\n');
            STATE.currentImages = [selected.image];
            this.renderImagePreviews();

        }, 2000);
    },

    showToast(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    new ThreeScene();
    STATE.recipes = Storage.load();
    UI.init();
});
