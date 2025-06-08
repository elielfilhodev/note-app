import { db, auth } from './db.js';
import {
    collection, query, where, orderBy, onSnapshot,
    doc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// --- ELEMENTOS DA UI ---
const notesGrid = document.getElementById('notesGrid');
const newNoteButton = document.getElementById('newNoteButton');
const noteEditor = document.getElementById('noteEditor');
const closeEditorButton = document.getElementById('closeEditorButton');
const saveNoteButton = document.getElementById('saveNoteButton');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const favoriteButton = document.getElementById('favoriteButton');
const archiveButton = document.getElementById('archiveButton');
const deleteButton = document.getElementById('deleteButton');
const lastEdited = document.getElementById('lastEdited');
const searchInput = document.getElementById('searchInput');
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const sidebarItems = document.querySelectorAll('.sidebar-item');
const dynamicIsland = document.getElementById('dynamicIsland');
const themeToggleButton = document.getElementById('theme-toggle');

// --- ESTADO DA APLICAÇÃO ---
let currentNoteId = null;
let currentFilter = 'all';
let isFavorite = false;
let isArchived = false;
let unsubscribeNotes = null; // Para parar de ouvir as notas ao deslogar

// --- FUNÇÕES PRINCIPAIS ---

// Carregar notas do Firestore
const loadNotes = () => {
    const user = auth.currentUser;
    if (!user) return;

    if (unsubscribeNotes) {
        unsubscribeNotes();
    }

    const notesCollection = collection(db, 'notes');
    let q;

    if (currentFilter === 'favorite') {
        q = query(notesCollection, where('userId', '==', user.uid), where('favorite', '==', true), orderBy('updatedAt', 'desc'));
    } else if (currentFilter === 'archived') {
        q = query(notesCollection, where('userId', '==', user.uid), where('archived', '==', true), orderBy('updatedAt', 'desc'));
    } else {
        q = query(notesCollection, where('userId', '==', user.uid), where('archived', '==', false), orderBy('updatedAt', 'desc'));
    }

    unsubscribeNotes = onSnapshot(q, snapshot => {
        notesGrid.innerHTML = '';
        if (snapshot.empty) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    <p>Nenhuma nota encontrada aqui.</p>
                </div>`;
            return;
        }
        snapshot.forEach(doc => {
            const note = { id: doc.id, ...doc.data() };
            renderNote(note);
        });
    }, error => {
        console.error('Erro ao carregar notas:', error);
        showDynamicIsland('Erro ao carregar notas');
    });
};

// Renderizar uma nota no grid
const renderNote = (note) => {
    const noteElement = document.createElement('div');
    noteElement.className = `note-card ${note.favorite ? 'favorite' : ''} ${note.archived ? 'archived' : ''}`;
    noteElement.dataset.id = note.id;

    noteElement.innerHTML = `
        <h3 class="note-title">${note.title || 'Sem título'}</h3>
        <p class="note-content">${(note.content || '').substring(0, 150)}</p>
        <div class="note-footer">
            <span>${formatDate(note.updatedAt)}</span>
            <div class="note-actions">
                <div class="note-action ${note.favorite ? 'favorite' : ''}" data-action="favorite">
                    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div class="note-action" data-action="archive">
                     <svg viewBox="0 0 24 24"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>
                </div>
            </div>
        </div>
    `;

    noteElement.addEventListener('click', () => openEditor(note));
    noteElement.querySelector('[data-action="favorite"]').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProperty(note.id, 'favorite', !note.favorite);
    });
    noteElement.querySelector('[data-action="archive"]').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProperty(note.id, 'archived', !note.archived);
    });

    notesGrid.appendChild(noteElement);
};

// Ordem correta das funções para evitar 'ReferenceError'
const openEditor = (note = null) => {
    if (note) {
        currentNoteId = note.id;
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        isFavorite = note.favorite || false;
        isArchived = note.archived || false;
        lastEdited.textContent = `Editado ${formatDate(note.updatedAt)}`;
    } else {
        currentNoteId = null;
        noteTitle.value = '';
        noteContent.value = '';
        isFavorite = false;
        isArchived = false;
        lastEdited.textContent = 'Nova nota';
    }
    updateActionButtons();
    noteEditor.classList.add('open');
    document.body.style.overflow = 'hidden';
};

const closeEditor = () => {
    noteEditor.classList.remove('open');
    document.body.style.overflow = '';
};

const saveNote = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title && !content) {
        if (currentNoteId) await deleteNote(true);
        closeEditor();
        return;
    }

    const noteData = {
        title,
        content,
        favorite: isFavorite,
        archived: isArchived,
        userId: user.uid,
        updatedAt: serverTimestamp()
    };

    try {
        if (currentNoteId) {
            await updateDoc(doc(db, 'notes', currentNoteId), noteData);
            showDynamicIsland('Nota atualizada');
        } else {
            await addDoc(collection(db, 'notes'), { ...noteData, createdAt: serverTimestamp() });
            showDynamicIsland('Nota criada');
        }
        closeEditor();
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        showDynamicIsland('Erro ao salvar nota');
    }
};

const deleteNote = async (silent = false) => {
    if (!currentNoteId) return;
    
    const confirmDelete = silent ? true : confirm('Tem certeza que deseja excluir esta nota? A ação não pode ser desfeita.');

    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, 'notes', currentNoteId));
            if (!silent) showDynamicIsland('Nota excluída');
            closeEditor();
        } catch (error) {
            console.error('Erro ao excluir nota:', error);
            if (!silent) showDynamicIsland('Erro ao excluir nota');
        }
    }
};

const toggleProperty = async (noteId, prop, value) => {
    try {
        await updateDoc(doc(db, 'notes', noteId), {
            [prop]: value,
            updatedAt: serverTimestamp()
        });
        const message = prop === 'favorite'
            ? (value ? 'Nota favoritada' : 'Nota desfavoritada')
            : (value ? 'Nota arquivada' : 'Nota desarquivada');
        showDynamicIsland(message);
    } catch (error) {
        console.error(`Erro ao atualizar ${prop}:`, error);
        showDynamicIsland('Erro ao atualizar nota');
    }
};

const updateActionButtons = () => {
    favoriteButton.classList.toggle('favorite', isFavorite);
};

const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'agora mesmo';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
};

const filterNotes = (filter) => {
    currentFilter = filter;
    sidebarItems.forEach(item => item.classList.toggle('active', item.dataset.filter === filter));
    loadNotes();
};

const searchNotes = () => {
    const searchTerm = searchInput.value.toLowerCase();
    document.querySelectorAll('.note-card').forEach(card => {
        const title = card.querySelector('.note-title').textContent.toLowerCase();
        const content = card.querySelector('.note-content').textContent.toLowerCase();
        card.style.display = (title.includes(searchTerm) || content.includes(searchTerm)) ? 'block' : 'none';
    });
};

export const showDynamicIsland = (message) => {
    dynamicIsland.textContent = message;
    dynamicIsland.classList.add('active');
    setTimeout(() => dynamicIsland.classList.remove('active'), 3000);
};

const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
};

// --- EVENT LISTENERS (aqui definimos os eventos de clique) ---
const setupEventListeners = () => {
    newNoteButton.addEventListener('click', () => openEditor());
    closeEditorButton.addEventListener('click', closeEditor);
    saveNoteButton.addEventListener('click', saveNote);
    favoriteButton.addEventListener('click', () => {
        isFavorite = !isFavorite;
        updateActionButtons();
    });
    archiveButton.addEventListener('click', () => {
        isArchived = !isArchived;
        updateActionButtons();
    });
    deleteButton.addEventListener('click', () => deleteNote(false));
    searchInput.addEventListener('input', searchNotes);
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
    });
    sidebarItems.forEach(item => {
        if (item.dataset.filter) {
            item.addEventListener('click', () => {
                filterNotes(item.dataset.filter);
                sidebar.classList.remove('open');
            });
        }
    });
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuButton.contains(e.target) && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && noteEditor.classList.contains('open')) {
            closeEditor();
        }
    });
    themeToggleButton.addEventListener('click', toggleTheme);
};

// --- INICIALIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        setupEventListeners();
        loadNotes();
    } else {
        if (unsubscribeNotes) {
            unsubscribeNotes();
        }
    }
});

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);