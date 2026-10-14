import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const colorDots = document.querySelectorAll('.color-dot');
const mainImage = document.getElementById('mainImage');
const mainPrice = document.getElementById('mainPrice');
const sizeButtons = document.querySelectorAll('.size-btn');
const cartDrawer = document.getElementById('cartDrawer');
const cartToggle = document.getElementById('cartToggle');
const closeCartButton = document.getElementById('closeCart');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const cartItemsElement = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const cartCountElement = document.getElementById('cartCount');
const checkoutDialog = document.getElementById('checkoutDialog');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutSubmit = document.getElementById('checkoutSubmit');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutResult = document.getElementById('checkoutResult');
const checkoutNotice = document.getElementById('checkoutNotice');
const accountDialog = document.getElementById('accountDialog');
const accountToggle = document.getElementById('accountToggle');
const accountForm = document.getElementById('accountForm');
const accountNameInput = document.getElementById('accountName');
const accountNameLabel = document.getElementById('accountNameLabel');
const accountEmailInput = document.getElementById('accountEmail');
const accountEmailLabel = document.getElementById('accountEmailLabel');
const accountPasswordInput = document.getElementById('accountPassword');
const accountPasswordLabel = document.getElementById('accountPasswordLabel');
const accountNewPasswordInput = document.getElementById('accountNewPassword');
const accountNewPasswordLabel = document.getElementById('accountNewPasswordLabel');
const accountMessage = document.getElementById('accountMessage');
const accountSubmit = document.getElementById('accountSubmit');
const accountModeToggle = document.getElementById('accountModeToggle');
const forgotPasswordButton = document.getElementById('forgotPassword');
const accountProfile = document.getElementById('accountProfile');
const accountProfileName = document.getElementById('accountProfileName');
const accountProfileEmail = document.getElementById('accountProfileEmail');
const accountProfileMessage = document.getElementById('accountProfileMessage');
const accountLogout = document.getElementById('accountLogout');
const cartStorageKey = 'puffer-club-cart';
const favoritesStorageKey = 'puffer-club-favorites';
const formatPrice = amount => `${amount.toLocaleString('fr-FR')} €`;

let selectedSize = document.querySelector('.size-btn.active')?.textContent.trim() || 'S';
let cart = loadCart();
let accountMode = 'register';
let signedInUser = null;
let recoveringPassword = false;
let favoriteProductIds = new Set();
let favoritesOwnerId = null;
let favoritesSyncGeneration = 0;
let favoritesBusy = false;
let favoritesSyncFailed = false;
let favoritesStatusMessage = '';

function showCheckoutNotice(message, isError = false) {
    checkoutNotice.textContent = message;
    checkoutNotice.classList.toggle('error', isError);
    checkoutNotice.hidden = false;
}

function loadCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
        if (!Array.isArray(savedCart)) throw new TypeError('Le panier enregistré doit être une liste.');

        const validCart = savedCart.filter(item =>
            item &&
            typeof item.productId === 'string' &&
            typeof item.name === 'string' &&
            typeof item.color === 'string' &&
            typeof item.size === 'string' &&
            Number.isFinite(item.price) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            item.quantity <= 10
        );
        if (validCart.length !== savedCart.length) {
            console.error('Certains articles invalides du panier enregistré ont été ignorés.');
        }
        return validCart;
    } catch (error) {
        console.error('Impossible de lire le panier enregistré.', error);
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch (error) {
        console.error('Impossible d’enregistrer le panier dans ce navigateur.', error);
        window.alert('Le panier ne peut pas être conservé après fermeture de cette page.');
    }
}

function renderCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    cartCountElement.textContent = totalItems;
    cartTotalElement.textContent = formatPrice(totalPrice);
    checkoutTotal.textContent = formatPrice(totalPrice);
    cartItemsElement.replaceChildren();

    if (cart.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-cart';
        emptyMessage.textContent = 'Votre panier est vide pour le moment.';
        cartItemsElement.append(emptyMessage);
        return;
    }

    cart.forEach((item, index) => {
        const row = document.createElement('article');
        row.className = 'cart-item';

        const details = document.createElement('div');
        details.className = 'cart-item-details';
        const name = document.createElement('h4');
        name.textContent = item.name;
        const variant = document.createElement('span');
        variant.textContent = `${item.color} · Taille ${item.size} · ${formatPrice(item.price)}`;
        details.append(name, variant);

        const controls = document.createElement('div');
        controls.className = 'cart-item-controls';
        const decrease = document.createElement('button');
        decrease.type = 'button';
        decrease.className = 'quantity-btn';
        decrease.dataset.action = 'decrease';
        decrease.dataset.index = index;
        decrease.setAttribute('aria-label', `Retirer une unité de ${item.name}`);
        decrease.textContent = '−';

        const quantity = document.createElement('span');
        quantity.textContent = item.quantity;
        quantity.setAttribute('aria-label', 'Quantité');

        const increase = document.createElement('button');
        increase.type = 'button';
        increase.className = 'quantity-btn';
        increase.dataset.action = 'increase';
        increase.dataset.index = index;
        increase.setAttribute('aria-label', `Ajouter une unité de ${item.name}`);
        increase.textContent = '+';
        increase.disabled = item.quantity >= 10;

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-item';
        remove.dataset.action = 'remove';
        remove.dataset.index = index;
        remove.textContent = 'Supprimer';

        controls.append(decrease, quantity, increase, remove);
        const lineTotal = document.createElement('strong');
        lineTotal.className = 'cart-line-total';
        lineTotal.textContent = formatPrice(item.price * item.quantity);
        row.append(details, controls, lineTotal);
        cartItemsElement.append(row);
    });
}

function setCartOpen(open) {
    cartDrawer.classList.toggle('open', open);
    cartDrawer.setAttribute('aria-hidden', String(!open));
    cartDrawer.inert = !open;
    drawerBackdrop.classList.toggle('visible', open);
    document.body.classList.toggle('drawer-open', open);
    if (open) closeCartButton.focus();
    else cartToggle.focus();
}

function addToCart(productId, name, price, color, size) {
    const existingItem = cart.find(item =>
        item.productId === productId && item.color === color && item.size === size
    );

    if (existingItem) {
        if (existingItem.quantity >= 10) {
            window.alert('La quantité maximale par variante est de 10.');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({ productId, name, price, color, size, quantity: 1 });
    }

    saveCart();
    renderCart();
    setCartOpen(true);
}

function updateAccountView() {
    const isSignedIn = Boolean(signedInUser) && !recoveringPassword;
    accountForm.hidden = isSignedIn;
    accountModeToggle.hidden = isSignedIn || recoveringPassword;
    forgotPasswordButton.hidden = isSignedIn || accountMode !== 'login' || recoveringPassword;
    accountProfile.hidden = !isSignedIn;
    accountToggle.setAttribute(
        'aria-label',
        isSignedIn
            ? `Compte connecté : ${signedInUser.user_metadata?.full_name || signedInUser.email}`
            : 'Créer un compte ou se connecter'
    );

    if (isSignedIn) {
        accountProfileName.textContent = signedInUser.user_metadata?.full_name || 'Mon compte';
        accountProfileEmail.textContent = signedInUser.email || '';
        accountProfileMessage.hidden = !accountProfileMessage.textContent;
    } else {
        updateAccountMode();
    }
}

function updateAccountMode() {
    const isRegistering = accountMode === 'register';
    const isForgot = accountMode === 'forgot';
    accountNameInput.hidden = !isRegistering;
    accountNameLabel.hidden = !isRegistering;
    accountNameInput.required = isRegistering;
    accountEmailInput.hidden = recoveringPassword;
    accountEmailLabel.hidden = recoveringPassword;
    accountEmailInput.required = !recoveringPassword;
    accountPasswordInput.hidden = isForgot || recoveringPassword;
    accountPasswordLabel.hidden = isForgot || recoveringPassword;
    accountPasswordInput.required = !isForgot && !recoveringPassword;
    accountPasswordInput.autocomplete = isRegistering ? 'new-password' : 'current-password';
    accountNewPasswordInput.hidden = !recoveringPassword;
    accountNewPasswordInput.required = recoveringPassword;
    accountNewPasswordLabel.hidden = !recoveringPassword;
    accountSubmit.textContent = recoveringPassword
        ? 'Définir le nouveau mot de passe'
        : isForgot
            ? 'Envoyer le lien de réinitialisation'
            : isRegistering
                ? 'Créer mon compte'
                : 'Se connecter';
    accountModeToggle.textContent = isRegistering
        ? 'Déjà un compte ? Se connecter'
        : isForgot
            ? 'Retour à la connexion'
            : 'Nouveau ici ? Créer un compte';
}

accountToggle.addEventListener('click', () => {
    updateAccountView();
    accountDialog.showModal();
});

document.getElementById('closeAccount').addEventListener('click', () => accountDialog.close());
accountDialog.addEventListener('click', event => {
    if (event.target === accountDialog) accountDialog.close();
});

accountModeToggle.addEventListener('click', () => {
    accountMode = accountMode === 'register'
        ? 'login'
        : accountMode === 'forgot'
            ? 'login'
            : 'register';
    accountForm.reset();
    accountMessage.textContent = '';
    updateAccountMode();
});

forgotPasswordButton.addEventListener('click', () => {
    accountMode = 'forgot';
    accountForm.reset();
    accountMessage.textContent = '';
    updateAccountMode();
    updateAccountView();
});

accountForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!accountForm.reportValidity()) return;

    if (!supabase) {
        accountMessage.textContent = 'La connexion au service de compte n’est pas encore configurée.';
        return;
    }

    const name = accountNameInput.value.trim();
    const email = accountEmailInput.value.trim().toLowerCase();
    const password = accountPasswordInput.value;
    accountSubmit.disabled = true;
    accountMessage.textContent = 'Traitement en cours…';

    try {
        if (recoveringPassword) {
            const { error } = await supabase.auth.updateUser({ password: accountNewPasswordInput.value });
            if (error) throw error;
            recoveringPassword = false;
            accountForm.reset();
            accountProfileMessage.textContent = 'Votre mot de passe a été modifié.';
            updateAccountView();
        } else if (accountMode === 'register') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name },
                    emailRedirectTo: window.location.origin
                }
            });
            if (error) throw error;
            if (data.session) {
                signedInUser = data.user;
                accountForm.reset();
                updateAccountView();
            } else {
                accountMessage.textContent = 'Vérifiez votre boîte e-mail pour confirmer la création du compte.';
            }
        } else if (accountMode === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            if (error) throw error;
            accountMessage.textContent = 'Si cette adresse correspond à un compte, un lien de réinitialisation vient d’être envoyé.';
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            signedInUser = data.user;
            accountForm.reset();
            updateAccountView();
        }
    } catch (error) {
        console.error('Échec de l’opération Supabase Auth.', error);
        accountMessage.textContent = error.message || 'Une erreur est survenue. Réessaie.';
    } finally {
        accountSubmit.disabled = false;
    }
});

accountLogout.addEventListener('click', async () => {
    if (!supabase) return;
    accountLogout.disabled = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        signedInUser = null;
        accountProfileMessage.textContent = '';
        accountMode = 'login';
        updateAccountView();
    } catch (error) {
        console.error('Impossible de fermer la session Supabase.', error);
        accountProfileMessage.textContent = error.message || 'La déconnexion a échoué. Réessaie.';
        accountProfileMessage.hidden = false;
    } finally {
        accountLogout.disabled = false;
    }
});

if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        signedInUser = session?.user || null;
        if (event === 'PASSWORD_RECOVERY') {
            recoveringPassword = true;
            accountMode = 'login';
            accountDialog.showModal();
        }
        updateAccountView();
        window.setTimeout(() => {
            void syncFavoritesWithAccount(session?.user || null);
        }, 0);
    });
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('Impossible de restaurer la session Supabase.', error);
            return;
        }
        signedInUser = data.session?.user || null;
        updateAccountView();
        void syncFavoritesWithAccount(signedInUser);
    }).catch(error => console.error('Impossible de restaurer la session Supabase.', error));
}
updateAccountView();

colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
        colorDots.forEach(colorDot => {
            colorDot.classList.remove('active');
            colorDot.setAttribute('aria-pressed', 'false');
        });
        dot.classList.add('active');
        dot.setAttribute('aria-pressed', 'true');

        const nextImage = dot.dataset.img;
        const price = Number(dot.dataset.price);
        dot.classList.remove('animate-pop');
        void dot.offsetWidth;
        dot.classList.add('animate-pop');
        mainImage.style.opacity = '0';
        window.setTimeout(() => {
            mainImage.src = nextImage;
            mainPrice.textContent = formatPrice(price);
            mainImage.alt = `Doudoune Puffer Club ${dot.dataset.color}`;
            mainImage.style.opacity = '1';
        }, 180);
    });
});

sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        sizeButtons.forEach(sizeButton => {
            sizeButton.classList.remove('active');
            sizeButton.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        selectedSize = button.textContent.trim();
        button.classList.remove('animate-pop');
        void button.offsetWidth;
        button.classList.add('animate-pop');
    });
});

document.getElementById('thumbSwitch')?.addEventListener('click', () => {
    document.querySelector('.color-dot.black')?.click();
});

cartToggle.addEventListener('click', () => {
    setCartOpen(cartDrawer.getAttribute('aria-hidden') === 'true');
});
closeCartButton.addEventListener('click', () => setCartOpen(false));
drawerBackdrop.addEventListener('click', () => setCartOpen(false));

cartItemsElement.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const item = cart[Number(button.dataset.index)];
    if (!item) return;
    if (button.dataset.action === 'increase' && item.quantity < 10) item.quantity += 1;
    if (button.dataset.action === 'decrease') item.quantity -= 1;
    if (button.dataset.action === 'remove' || item.quantity <= 0) {
        cart.splice(Number(button.dataset.index), 1);
    }
    saveCart();
    renderCart();
});

document.querySelectorAll('.add-to-cart, .add-to-cart-card').forEach(button => {
    button.addEventListener('click', () => {
        const productId = button.dataset.productId;
        const heroButton = button.dataset.priceSource === 'hero';
        const selectedColor = document.querySelector('.color-dot.active');
        const price = Number(heroButton ? selectedColor?.dataset.price : button.dataset.price);
        const color = heroButton ? (selectedColor?.dataset.color || 'Orange') : (button.dataset.color || 'Orange');
        const size = heroButton
            ? selectedSize
            : (button.closest('.product-card')?.querySelector('.card-size-button.active')?.dataset.size || 'S');

        if (!productId || !button.dataset.name || !Number.isFinite(price) || price <= 0) {
            console.error('Produit invalide : identifiant, nom ou prix manquant.', button);
            return;
        }

        button.classList.remove('animate-pop');
        void button.offsetWidth;
        button.classList.add('animate-pop');
        addToCart(productId, button.dataset.name, price, color, size);
    });
});

document.querySelectorAll('.card-size-selector').forEach(selector => {
    selector.addEventListener('click', event => {
        const selectedButton = event.target.closest('.card-size-button');
        if (!selectedButton) return;

        selector.querySelectorAll('.card-size-button').forEach(button => {
            const isSelected = button === selectedButton;
            button.classList.toggle('active', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
        });
    });
});

document.querySelectorAll('.product-card').forEach(card => {
    const colorOptions = card.querySelectorAll('.mini-colors .dot');
    const productImage = card.querySelector('.product-img img');
    const selectedColorLabel = card.querySelector('.selected-color');
    const priceLabel = card.querySelector('.card-price .current');
    const addButton = card.querySelector('.add-to-cart-card');
    const productName = addButton.dataset.name;

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(colorOption => {
                const active = colorOption === option;
                colorOption.classList.toggle('active', active);
                colorOption.setAttribute('aria-pressed', String(active));
            });
            const color = option.dataset.color;
            const transitionId = Number(productImage.dataset.transitionId || 0) + 1;
            productImage.dataset.transitionId = transitionId;
            productImage.classList.add('changing');
            window.setTimeout(() => {
                if (Number(productImage.dataset.transitionId) !== transitionId) return;
                productImage.src = option.dataset.img;
                productImage.classList.remove('changing');
            }, 120);
            productImage.alt = `${productName} — coloris ${color}`;
            selectedColorLabel.textContent = color;
            priceLabel.textContent = formatPrice(Number(option.dataset.price));
            addButton.dataset.color = color;
            addButton.dataset.price = option.dataset.price;
            addButton.setAttribute('aria-label', `Ajouter ${productName} ${color} au panier`);
            option.classList.remove('animate-pop');
            void option.offsetWidth;
            option.classList.add('animate-pop');
        });
    });
});

cartDrawer.querySelector('.checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) {
        window.alert('Votre panier est vide. Ajoutez un produit pour continuer.');
        return;
    }
    checkoutResult.textContent = '';
    checkoutForm.reset();
    checkoutDialog.showModal();
});

document.getElementById('closeCheckout').addEventListener('click', () => checkoutDialog.close());
checkoutDialog.addEventListener('click', event => {
    if (event.target === checkoutDialog) checkoutDialog.close();
});

checkoutForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (cart.length === 0) {
        checkoutResult.textContent = 'Votre panier est vide. Ajoutez un produit pour continuer.';
        return;
    }

    checkoutSubmit.disabled = true;
    checkoutResult.textContent = 'Préparation du paiement sécurisé…';
    try {
        let session = null;
        if (supabase) {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            session = data.session;
        }
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
                items: cart.map(({ productId, color, size, quantity }) => ({ productId, color, size, quantity }))
            })
        });
        const result = await response.json();
        if (!response.ok || typeof result.url !== 'string') {
            throw new Error(result.error || 'Impossible de démarrer le paiement.');
        }
        window.location.assign(result.url);
    } catch (error) {
        console.error('Impossible de démarrer le paiement Stripe.', error);
        checkoutResult.textContent = error.message || 'Une erreur est survenue. Réessaie.';
        checkoutSubmit.disabled = false;
    }
});

async function verifyPaymentReturn() {
    const url = new URL(window.location.href);
    const checkoutState = url.searchParams.get('checkout');
    if (!checkoutState) return;
    let clearReturnParams = false;

    if (checkoutState === 'cancel') {
        showCheckoutNotice('Paiement annulé. Votre panier est conservé.');
        clearReturnParams = true;
    } else if (checkoutState === 'success') {
        const sessionId = url.searchParams.get('session_id');
        if (!sessionId) {
            showCheckoutNotice('Le paiement ne peut pas être vérifié. Contactez le support avec votre confirmation Stripe.', true);
            clearReturnParams = true;
        } else {
            try {
                for (let attempt = 0; attempt < 5; attempt += 1) {
                    const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`);
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'La confirmation du paiement est indisponible.');

                    if (result.paymentStatus === 'paid') {
                        cart = [];
                        saveCart();
                        renderCart();
                        showCheckoutNotice('Paiement confirmé. Votre panier a été effacé.');
                        clearReturnParams = true;
                        break;
                    }
                    if (result.paymentStatus !== 'unpaid' || attempt === 4) {
                        showCheckoutNotice('Le paiement est en cours de confirmation. Votre panier est conservé.');
                        break;
                    }
                    await new Promise(resolve => window.setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error('Échec de vérification du retour Stripe.', error);
                showCheckoutNotice(error.message || 'La confirmation du paiement est indisponible.', true);
            }
        }
    }

    if (clearReturnParams) {
        url.searchParams.delete('checkout');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
}

verifyPaymentReturn();

const filterButtons = document.querySelectorAll('.pill');
const productCards = document.querySelectorAll('.product-card');
const favoritesToggle = document.getElementById('favoritesToggle');
const favoritesCount = document.getElementById('favoritesCount');
const favoritesStatus = document.getElementById('favoritesStatus');
const favoritesEmpty = document.getElementById('favoritesEmpty');
const productIds = new Set(
    Array.from(productCards, card => card.querySelector('.add-to-cart-card')?.dataset.productId)
        .filter(productId => typeof productId === 'string')
);

function loadFavoriteProductIds() {
    try {
        const savedFavorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || '[]');
        const favoriteData = Array.isArray(savedFavorites)
            ? { ownerId: null, productIds: savedFavorites }
            : savedFavorites;
        if (
            !favoriteData ||
            (favoriteData.ownerId !== null && typeof favoriteData.ownerId !== 'string') ||
            !Array.isArray(favoriteData.productIds) ||
            favoriteData.productIds.some(productId => typeof productId !== 'string')
        ) {
            throw new TypeError('Les favoris enregistrés doivent être une liste d’identifiants.');
        }
        if (favoriteData.ownerId !== null) return new Set();
        return new Set(favoriteData.productIds.filter(productId => productIds.has(productId)));
    } catch (error) {
        console.error('Impossible de lire les favoris enregistrés.', error);
        return new Set();
    }
}

favoriteProductIds = loadFavoriteProductIds();

function saveFavoriteProductIds(ownerId = null) {
    try {
        localStorage.setItem(favoritesStorageKey, JSON.stringify({
            ownerId,
            productIds: [...favoriteProductIds]
        }));
        return true;
    } catch (error) {
        console.error('Impossible d’enregistrer les favoris dans ce navigateur.', error);
        return false;
    }
}

async function syncFavoritesWithAccount(user) {
    const generation = ++favoritesSyncGeneration;
    favoritesBusy = true;
    favoritesSyncFailed = false;
    if (user) favoriteProductIds = new Set();
    updateFavoritesView('Synchronisation des favoris…');

    if (!user) {
        favoritesOwnerId = null;
        favoriteProductIds = loadFavoriteProductIds();
        favoritesBusy = false;
        updateFavoritesView();
        applyProductFilter(document.querySelector('.pill.active')?.dataset.filter || 'all');
        return;
    }

    const guestFavorites = loadFavoriteProductIds();
    try {
        const { data, error } = await supabase
            .from('user_favorites')
            .select('product_id')
            .eq('user_id', user.id);
        if (error) throw error;
        if (generation !== favoritesSyncGeneration) return;

        const accountFavorites = new Set(
            data.map(({ product_id }) => product_id).filter(productId => productIds.has(productId))
        );
        const guestFavoritesToAdd = [...guestFavorites]
            .filter(productId => !accountFavorites.has(productId))
            .map(product_id => ({ user_id: user.id, product_id }));

        if (guestFavoritesToAdd.length > 0) {
            const { error: saveError } = await supabase
                .from('user_favorites')
                .upsert(guestFavoritesToAdd, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
            if (saveError) throw saveError;
        }
        if (generation !== favoritesSyncGeneration) return;

        favoritesOwnerId = user.id;
        favoriteProductIds = new Set([...accountFavorites, ...guestFavorites]);
        favoritesBusy = false;
        if (!saveFavoriteProductIds(user.id)) {
            favoritesStatusMessage = 'Favoris synchronisés avec votre compte, mais non mémorisés sur cet appareil.';
        } else {
            favoritesStatusMessage = '';
        }
        applyProductFilter(document.querySelector('.pill.active')?.dataset.filter || 'all');
    } catch (error) {
        if (generation !== favoritesSyncGeneration) return;
        console.error('Impossible de synchroniser les favoris avec le compte.', error);
        favoritesOwnerId = null;
        favoritesBusy = false;
        favoritesSyncFailed = true;
        updateFavoritesView('Synchronisation indisponible. Vérifiez la configuration de la table des favoris dans Supabase.');
        applyProductFilter(document.querySelector('.pill.active')?.dataset.filter || 'all');
    }
}

function updateFavoritesView(statusMessage = favoritesStatusMessage) {
    favoritesCount.textContent = favoriteProductIds.size;
    favoritesCount.hidden = favoriteProductIds.size === 0;
    favoritesToggle.disabled = favoritesBusy;
    favoritesToggle.setAttribute(
        'aria-label',
        `Afficher mes favoris (${favoriteProductIds.size})`
    );
    favoritesStatusMessage = statusMessage;
    favoritesStatus.textContent = favoritesStatusMessage;
    document.querySelector('.pill[data-filter="favorites"]').disabled =
        favoritesBusy || (Boolean(signedInUser) && favoritesSyncFailed);

    productCards.forEach(card => {
        const productId = card.querySelector('.add-to-cart-card')?.dataset.productId;
        const button = card.querySelector('.favorite-toggle');
        const isFavorite = favoriteProductIds.has(productId);
        button.disabled = favoritesBusy || (Boolean(signedInUser) && favoritesSyncFailed);
        button.setAttribute('aria-pressed', String(isFavorite));
        button.setAttribute(
            'aria-label',
            `${isFavorite ? 'Retirer' : 'Ajouter'} ${card.querySelector('.product-info h3').textContent} ${isFavorite ? 'des' : 'aux'} favoris`
        );
        button.classList.toggle('active', isFavorite);
        button.querySelector('i').classList.toggle('fa-solid', isFavorite);
        button.querySelector('i').classList.toggle('fa-regular', !isFavorite);
    });

    favoritesEmpty.hidden = favoritesBusy ||
        favoritesSyncFailed ||
        document.querySelector('.pill.active')?.dataset.filter !== 'favorites' ||
        favoriteProductIds.size > 0;
}

function applyProductFilter(filter) {
    filterButtons.forEach(button => {
        const isActive = button.dataset.filter === filter;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
    productCards.forEach(card => {
        const categories = card.dataset.category.split(' ');
        const productId = card.querySelector('.add-to-cart-card')?.dataset.productId;
        card.hidden = filter === 'favorites'
            ? !favoriteProductIds.has(productId)
            : filter !== 'all' && !categories.includes(filter);
    });
    updateFavoritesView();
}

filterButtons.forEach(button => {
    button.addEventListener('click', () => applyProductFilter(button.dataset.filter));
});

productCards.forEach(card => {
    card.querySelector('.favorite-toggle').addEventListener('click', async event => {
        const productId = card.querySelector('.add-to-cart-card')?.dataset.productId;
        if (!productId) {
            console.error('Impossible de gérer le favori : identifiant du produit manquant.', card);
            return;
        }

        const wasFavorite = favoriteProductIds.has(productId);
        const isFavorite = !wasFavorite;
        const ownerId = favoritesOwnerId;
        if (ownerId) {
            event.currentTarget.disabled = true;
            favoritesStatus.textContent = 'Enregistrement des favoris…';
            try {
                const { error } = isFavorite
                    ? await supabase.from('user_favorites').upsert({
                        user_id: ownerId,
                        product_id: productId
                    }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
                    : await supabase.from('user_favorites')
                        .delete()
                        .eq('user_id', ownerId)
                        .eq('product_id', productId);
                if (error) throw error;
                if (favoritesOwnerId !== ownerId) return;
            } catch (error) {
                if (favoritesOwnerId !== ownerId) return;
                console.error('Impossible d’enregistrer le favori dans le compte.', error);
                favoritesStatus.textContent = 'Impossible de mettre à jour ce favori. Réessaie.';
                event.currentTarget.disabled = false;
                return;
            }
        }

        if (isFavorite) favoriteProductIds.add(productId);
        else favoriteProductIds.delete(productId);

        const saved = favoritesOwnerId ? true : saveFavoriteProductIds();
        const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';
        applyProductFilter(activeFilter);
        favoritesStatus.textContent = saved
            ? isFavorite ? 'Produit ajouté aux favoris.' : 'Produit retiré des favoris.'
            : 'Impossible d’enregistrer les favoris sur cet appareil.';
        if (activeFilter === 'favorites' && !isFavorite) {
            document.querySelector('.pill[data-filter="favorites"]').focus();
        } else {
            event.currentTarget.focus();
        }
    });
});

favoritesToggle.addEventListener('click', () => {
    if (signedInUser && favoritesSyncFailed) {
        void syncFavoritesWithAccount(signedInUser);
        return;
    }
    applyProductFilter('favorites');
    document.getElementById('collection').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
});

updateFavoritesView();

document.querySelector('[data-footer-filter="new"]')?.addEventListener('click', () => applyProductFilter('new'));

document.querySelectorAll('.legal-links a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
        const notice = document.getElementById(link.hash.slice(1));
        if (notice instanceof HTMLDetailsElement) notice.open = true;
    });
});

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

function setMenuOpen(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    navLinks.classList.toggle('open', open);
}

menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && cartDrawer.classList.contains('open')) setCartOpen(false);
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    revealItems.forEach(item => revealObserver.observe(item));
} else {
    revealItems.forEach(item => item.classList.add('visible'));
}

const heroSection = document.querySelector('.hero-section');
if (heroSection && mainImage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroSection.addEventListener('mousemove', event => {
        if (event.pointerType === 'touch') return;
        const rect = heroSection.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        mainImage.style.transform = `translate(${x * 18}px, ${y * 18}px) rotate(${x * 4}deg)`;
    });
    heroSection.addEventListener('mouseleave', () => { mainImage.style.transform = ''; });
}

renderCart();
