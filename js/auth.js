import { auth } from './db.js';

// Elementos da UI
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const googleSignInBtn = document.getElementById('googleSignIn');
const signOutButton = document.getElementById('signOutButton');
const userAvatar = document.getElementById('userAvatar');
const dynamicIsland = document.getElementById('dynamicIsland');

// Inicializar autenticação
const initAuth = () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário logado
            showApp(user);
        } else {
            // Usuário não logado
            showAuth();
        }
    });
};

// Mostrar tela de autenticação
const showAuth = () => {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
};

// Mostrar aplicativo
const showApp = (user) => {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Atualizar avatar do usuário
    if (user.photoURL) {
        userAvatar.src = user.photoURL;
    } else {
        // Avatar padrão se não houver foto
        userAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=007AFF&color=fff';
    }
    
    // Mostrar notificação no Dynamic Island
    showDynamicIsland(`Bem-vindo, ${user.displayName || user.email.split('@')[0]}!`);
};

// Login com Google
const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            // Login bem-sucedido
            showDynamicIsland('Login realizado com sucesso!');
        })
        .catch(error => {
            console.error('Erro no login:', error);
            showDynamicIsland('Erro no login: ' + error.message);
        });
};

// Logout
const signOut = () => {
    auth.signOut()
        .then(() => {
            showDynamicIsland('Você saiu da sua conta');
        })
        .catch(error => {
            console.error('Erro ao sair:', error);
            showDynamicIsland('Erro ao sair: ' + error.message);
        });
};

// Mostrar notificação no Dynamic Island
const showDynamicIsland = (message) => {
    dynamicIsland.textContent = message;
    dynamicIsland.classList.add('active');
    
    setTimeout(() => {
        dynamicIsland.classList.remove('active');
    }, 3000);
};

// Event listeners
googleSignInBtn.addEventListener('click', signInWithGoogle);
signOutButton.addEventListener('click', signOut);

// Inicializar
initAuth();