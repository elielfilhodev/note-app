// Importe as funções que você precisa dos SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// ATENÇÃO: Cole a configuração do seu projeto Firebase aqui
const firebaseConfig = {
  apiKey: "AIzaSyAc66GqY8AwrtbMRPusVum5qFltYl7dVcs",
  authDomain: "notas-app-7096e.firebaseapp.com",
  projectId: "notas-app-7096e",
  storageBucket: "notas-app-7096e.firebasestorage.app",
  messagingSenderId: "741699943020",
  appId: "1:741699943020:web:ff23fc17a5a42f1fe03649"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços que vamos usar
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta os serviços para serem usados em outros arquivos
export { db, auth };