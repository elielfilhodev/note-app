import { auth } from './db.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { showDynamicIsland } from './app.js'; // Importando a função de notificação


const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const googleSignInBtn = document.getElementById('googleSignIn');
const signOutButton = document.getElementById('signOutButton');
const userAvatar = document.getElementById('userAvatar');

// Mostrar tela de autenticação
const showAuth = () => {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
};

// Mostrar aplicativo
const showApp = (user) => {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');

    if (user.photoURL) {
        userAvatar.src = user.photoURL;
    } else {
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=007AFF&color=fff`;
    }

    showDynamicIsland(`Bem-vindo, ${user.displayName || user.email.split('@')[0]}!`);
};

// Login com Google
const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(result => {
            showDynamicIsland('Login realizado com sucesso!');
        })
        .catch(error => {
            console.error('Erro no login:', error);
            // O erro 'auth/unauthorized-domain' aparecerá aqui
            showDynamicIsland(`Erro no login: ${error.code}`);
        });
};

// Logout
const doSignOut = () => {
    signOut(auth)
        .then(() => {
            showDynamicIsland('Você saiu da sua conta');
        })
        .catch(error => {
            console.error('Erro ao sair:', error);
            showDynamicIsland(`Erro ao sair: ${error.message}`);
        });
};

// Monitora o estado da autenticação
const initAuth = () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            showApp(user);
        } else {
            showAuth();
        }
    });
};

// Event listeners
googleSignInBtn.addEventListener('click', signInWithGoogle);
signOutButton.addEventListener('click', doSignOut);

// Inicializa a autenticação
initAuth();