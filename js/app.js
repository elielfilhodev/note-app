import { db, auth } from './db.js';

// Elementos da UI
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
const sidebarItems = document.querySelectorAll('.sidebar-item');
const dynamicIsland = document.getElementById('dynamicIsland');

// Variáveis de estado
let currentNoteId = null;
let currentFilter = 'all';
let isFavorite = false;
let isArchived = false;
let notes = [];

// Inicializar o app
const initApp = () => {
    loadNotes();
    setupEventListeners();
};

// Carregar notas do Firestore
const loadNotes = () => {
    const user = auth.currentUser;
    if (!user) return;

    let query = db.collection('notes')
        .where('userId', '==', user.uid)
        .orderBy('updatedAt', 'desc');

    // Aplicar filtro
    if (currentFilter === 'favorite') {
        query = query.where('favorite', '==', true);
    } else if (currentFilter === 'archived') {
        query = query.where('archived', '==', true);
    }

    query.onSnapshot(snapshot => {
        notes = [];
        notesGrid.innerHTML = '';

        snapshot.forEach(doc => {
            const note = {
                id: doc.id,
                ...doc.data()
            };
            notes.push(note);
            renderNote(note);
        });

        if (notes.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                    </svg>
                    <p>Nenhuma nota encontrada</p>
                </div>
            `;
        }
    }, error => {
        console.error('Erro ao carregar notas:', error);
        showDynamicIsland('Erro ao carregar notas');
    });
};

// Renderizar uma nota no grid
const renderNote = (note) => {
    const noteElement = document.createElement('div');
    noteElement.className = `note-card ${note.favorite ? 'favorite' : ''} ${note.archived ? 'archived' : ''}`;
    noteElement.innerHTML = `
        <h3 class="note-title">${note.title || 'Sem título'}</h3>
        <p class="note-content">${note.content || ''}</p>
        <div class="note-footer">
            <span>${formatDate(note.updatedAt)}</span>
            <div class="note-actions">
                <div class="note-action ${note.favorite ? 'favorite' : ''}" data-action="favorite">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <div class="note-action" data-action="archive">
                    <svg viewBox="0 0 24 24">
                        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
                    </svg>
                </div>
            </div>
        </div>
    `;

    noteElement.addEventListener('click', () => openEditor(note));
    
    // Adicionar event listeners para ações
    const favoriteBtn = noteElement.querySelector('[data-action="favorite"]');
    const archiveBtn = noteElement.querySelector('[data-action="archive"]');
    
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(note.id, !note.favorite);
    });
    
    archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleArchive(note.id, !note.archived);
    });

    notesGrid.appendChild(noteElement);
};

// Abrir editor de notas
const openEditor = (note = null) => {
    if (note) {
        // Editar nota existente
        currentNoteId = note.id;
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        isFavorite = note.favorite || false;
        isArchived = note.archived || false;
        lastEdited.textContent = `Editado em ${formatDate(note.updatedAt)}`;
    } else {
        // Nova nota
        currentNoteId = null;
        noteTitle.value = '';
        noteContent.value = '';
        isFavorite = false;
        isArchived = false;
        lastEdited.textContent = 'Nova nota';
    }
    
    // Atualizar botões
    updateActionButtons();
    
    // Mostrar editor
    noteEditor.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Focar no título
    setTimeout(() => {
        noteTitle.focus();
    }, 100);
};

// Fechar editor de notas
const closeEditor = () => {
    noteEditor.classList.remove('open');
    document.body.style.overflow = '';
};

// Salvar nota
const saveNote = () => {
    const user = auth.currentUser;
    if (!user) return;

    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    
    if (!title && !content) {
        showDynamicIsland('Nota vazia não será salva');
        closeEditor();
        return;
    }
    
    const noteData = {
        title,
        content,
        favorite: isFavorite,
        archived: isArchived,
        userId: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (currentNoteId) {
        // Atualizar nota existente
        db.collection('notes').doc(currentNoteId).update(noteData)
            .then(() => {
                showDynamicIsland('Nota atualizada');
                closeEditor();
            })
            .catch(error => {
                console.error('Erro ao atualizar nota:', error);
                showDynamicIsland('Erro ao salvar nota');
            });
    } else {
        // Criar nova nota
        db.collection('notes').add(noteData)
            .then(() => {
                showDynamicIsland('Nota criada');
                closeEditor();
            })
            .catch(error => {
                console.error('Erro ao criar nota:', error);
                showDynamicIsland('Erro ao criar nota');
            });
    }
};

// Alternar favorito
const toggleFavorite = (noteId, favorite) => {
    db.collection('notes').doc(noteId).update({
        favorite,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showDynamicIsland(favorite ? 'Nota favoritada' : 'Nota desfavoritada');
    })
    .catch(error => {
        console.error('Erro ao atualizar favorito:', error);
        showDynamicIsland('Erro ao atualizar nota');
    });
};

// Alternar arquivado
const toggleArchive = (noteId, archived) => {
    db.collection('notes').doc(noteId).update({
        archived,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showDynamicIsland(archived ? 'Nota arquivada' : 'Nota desarquivada');
    })
    .catch(error => {
        console.error('Erro ao arquivar nota:', error);
        showDynamicIsland('Erro ao arquivar nota');
    });
};

// Deletar nota
const deleteNote = () => {
    if (!currentNoteId) return;
    
    if (confirm('Tem certeza que deseja excluir esta nota?')) {
        db.collection('notes').doc(currentNoteId).delete()
            .then(() => {
                showDynamicIsland('Nota excluída');
                closeEditor();
            })
            .catch(error => {
                console.error('Erro ao excluir nota:', error);
                showDynamicIsland('Erro ao excluir nota');
            });
    }
};

// Atualizar botões de ação
const updateActionButtons = () => {
    favoriteButton.classList.toggle('favorite', isFavorite);
    archiveButton.classList.toggle('archived', isArchived);
};

// Formatar data
const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
        return 'Hoje';
    } else if (diffInDays === 1) {
        return 'Ontem';
    } else if (diffInDays < 7) {
        return `${diffInDays} dias atrás`;
    } else {
        return date.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
};

// Filtrar notas
const filterNotes = (filter) => {
    currentFilter = filter;
    loadNotes();
    
    // Atualizar item ativo na sidebar
    sidebarItems.forEach(item => {
        item.classList.toggle('active', item.dataset.filter === filter);
    });
};

// Buscar notas
const searchNotes = () => {
    const searchTerm = searchInput.value.toLowerCase();
    
    document.querySelectorAll('.note-card').forEach(card => {
        const title = card.querySelector('.note-title').textContent.toLowerCase();
        const content = card.querySelector('.note-content').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || content.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
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

// Configurar event listeners
const setupEventListeners = () => {
    // Botão nova nota
    newNoteButton.addEventListener('click', () => openEditor());
    
    // Botão fechar editor
    closeEditorButton.addEventListener('click', closeEditor);
    
    // Botão salvar nota
    saveNoteButton.addEventListener('click', saveNote);
    
    // Botões de ação
    favoriteButton.addEventListener('click', () => {
        isFavorite = !isFavorite;
        updateActionButtons();
    });
    
    archiveButton.addEventListener('click', () => {
        isArchived = !isArchived;
        updateActionButtons();
    });
    
    deleteButton.addEventListener('click', deleteNote);
    
    // Busca
    searchInput.addEventListener('input', searchNotes);
    
    // Menu sidebar
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Filtros
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const filter = item.dataset.filter;
            if (filter) {
                filterNotes(filter);
                sidebar.classList.remove('open');
            }
        });
    });
    
    // Fechar sidebar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && e.target !== menuButton) {
            sidebar.classList.remove('open');
        }
    });
    
    // Fechar editor com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && noteEditor.classList.contains('open')) {
            closeEditor();
        }
    });
};

// Inicializar o app quando o usuário estiver autenticado
auth.onAuthStateChanged(user => {
    if (user) {
        initApp();
    }
});