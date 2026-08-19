
let sessions = [];
let activeSessionId = null;
let messages = [];
let isSidebarOpen = true;
let isThinking = false;

const studentId = 3; 
const taskId = 4; 

const sidebar = document.getElementById('sidebar');
const desktopSidebarToggle = document.getElementById('desktop-sidebar-toggle');
const sessionsList = document.getElementById('sessions-list');
const mobileSessionTitle = document.getElementById('mobile-session-title');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSubmit = document.getElementById('chat-submit');

document.addEventListener('DOMContentLoaded', () => {
    fetchSessions();
    lucide.createIcons();

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            chatSubmit.removeAttribute('disabled');
        } else {
            chatSubmit.setAttribute('disabled', 'true');
        }
    });

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    chatForm.addEventListener('submit', handleSubmit);

    if (window.innerWidth < 768) {
        isSidebarOpen = false;
        updateSidebarUI();
    }
});

function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    updateSidebarUI();
}

function updateSidebarUI() {
    if (isSidebarOpen) {
        sidebar.classList.remove('w-0', '-translate-x-full');
        sidebar.classList.add('w-72', 'translate-x-0');
        if (window.innerWidth >= 768) {
            desktopSidebarToggle.classList.add('hidden');
            desktopSidebarToggle.classList.remove('md:flex');
        }
    } else {
        sidebar.classList.remove('w-72', 'translate-x-0');
        sidebar.classList.add('w-0', '-translate-x-full');
        if (window.innerWidth >= 768) {
            sidebar.classList.add('md:translate-x-0', 'md:w-0');
            desktopSidebarToggle.classList.remove('hidden');
            desktopSidebarToggle.classList.add('md:flex');
        }
    }
}

function renderSessions() {
    sessionsList.innerHTML = '';
    sessions.forEach(session => {
        const isActive = activeSessionId === session.id;

        const sessionEl = document.createElement('div');
        sessionEl.className = `group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`;
        sessionEl.onclick = () => {
            activeSessionId = session.id;
            fetchSessionDetails(activeSessionId);
            if (window.innerWidth < 768) toggleSidebar();
        };

        sessionEl.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <i data-lucide="message-square" class="${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} w-4 h-4"></i>
                <span class="truncate text-sm font-medium">${session.title}</span>
            </div>
            <button 
                class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all focus:outline-none delete-btn"
                title="Törlés"
                data-id="${session.id}"
            >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        sessionsList.appendChild(sessionEl);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteSession(parseInt(btn.getAttribute('data-id')));
        };
    });

    lucide.createIcons();

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession) {
        mobileSessionTitle.textContent = activeSession.title;
    }
}

function escapeHtml(unsafe) {
    if (unsafe == null) return "";
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function renderMessages() {

    const emptyStateHTML = emptyState.outerHTML;

    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
        messagesContainer.innerHTML = emptyStateHTML;
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    messages.forEach((msg, index) => {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;

        let innerHTML = `<div class="p-4 md:p-5 rounded-2xl max-w-[85%] md:max-w-[75%] shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600/30 to-blue-700/20 border border-blue-500/30 text-blue-50 rounded-tr-sm' : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-tl-sm shadow-black/20'}">`;

        if (msg.role === 'user') {
            innerHTML += `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(msg.content)}</p>`;
        } else {
            innerHTML += `<div class="space-y-3">`;

            if (msg.isEvaluation && msg.evaluationData) {
                const evalData = msg.evaluationData;
                const isRejected = evalData.status === 'rejected';
                innerHTML += `
                    <div class="p-4 border rounded-xl ${isRejected ? 'bg-red-900/10 border-red-500/30 text-red-200' : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-200'}">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-2 h-2 rounded-full ${isRejected ? 'bg-red-500' : 'bg-yellow-500'}"></div>
                            <h4 class="font-semibold text-sm uppercase tracking-wider">Kapuőr Értékelés</h4>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">K (Tudástér)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.K}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.K_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">O (Cél)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.O}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.O_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">S (Részfeladat)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.S}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.S_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">I (Bemenet)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.I}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.I_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">C (Ellenőrzés)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.C}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.C_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                            <div class="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center group relative cursor-help">
                                <span class="opacity-70 text-xs">E (Kimenet)</span> 
                                <span class="font-bold flex items-center gap-1">${evalData.scores.E}/2 <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i></span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-xs text-white rounded shadow-xl border border-slate-700 z-10 break-words">
                                    ${escapeHtml(evalData.scores.E_indoklas || "Nincs megadva.")}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (msg.content) {
                let tokenInfoHTML = '';
                if (msg.evaluationData && msg.evaluationData.token_cost) {
                    tokenInfoHTML = `
                        <div class="absolute -top-3 -right-3 group/token cursor-help">
                            <div class="bg-slate-700 rounded-full p-1 border border-slate-600 hover:bg-slate-600 transition-colors">
                                <i data-lucide="info" class="w-3.5 h-3.5 text-slate-300"></i>
                            </div>
                            <div class="absolute bottom-full right-0 mb-1 hidden group-hover/token:block w-32 p-1.5 bg-slate-800 text-[10px] text-center text-white rounded shadow-xl border border-slate-700 z-10">
                                Felhasznált tokenek: ${msg.evaluationData.token_cost}
                            </div>
                        </div>
                    `;
                }

                innerHTML += `
                    <div class="relative mt-2">
                        ${tokenInfoHTML}
                        <div class="markdown-content leading-relaxed text-[15px] space-y-2">${marked.parse(msg.content)}</div>
                    </div>
                `;
            }

            if (!msg.content && !msg.isEvaluation) {
                innerHTML += `
                    <div class="flex space-x-1.5 items-center h-5 px-1">
                        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-0"></div>
                        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-150"></div>
                        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-300"></div>
                    </div>
                `;
            }
            innerHTML += `</div>`;
        }
        innerHTML += `</div>`;
        msgWrapper.innerHTML = innerHTML;
        msgWrapper.id = `msg-${index}`;
        messagesContainer.appendChild(msgWrapper);
    });

    if (isThinking) {
        const thinkingWrapper = document.createElement('div');
        thinkingWrapper.className = `flex justify-start`;
        thinkingWrapper.id = "thinking-indicator";
        thinkingWrapper.innerHTML = `
            <div class="p-4 md:p-5 rounded-2xl shadow-sm bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-tl-sm shadow-black/20">
                <div class="flex space-x-1.5 items-center h-5 px-1">
                    <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-0"></div>
                    <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-150"></div>
                    <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animate-bounce-300"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(thinkingWrapper);
    }

    scrollToBottom();
}

function updateLastMessageContent(content) {
    const lastMsgIndex = messages.length - 1;
    if (lastMsgIndex >= 0 && messages[lastMsgIndex].role === 'assistant') {
        messages[lastMsgIndex].content = content;

        const msgEl = document.getElementById(`msg-${lastMsgIndex}`);
        if (msgEl) {
            let contentDiv = msgEl.querySelector('.markdown-content');
            if (!contentDiv) contentDiv = msgEl.querySelector('.whitespace-pre-wrap'); 

            if (contentDiv) {
                contentDiv.innerHTML = marked.parse(content);
            } else {

                renderMessages();
            }
        }
        scrollToBottom();
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function fetchSessions() {
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/sessions/${studentId}`);
        if (res.ok) {
            const data = await res.json();
            sessions = data.map(s => ({
                id: s.id,
                title: s.title,
                updatedAt: s.updated_at
            }));

            if (sessions.length > 0 && !activeSessionId) {
                activeSessionId = sessions[0].id;
                fetchSessionDetails(activeSessionId);
            } else if (sessions.length === 0) {
                createNewSession();
            } else {
                renderSessions();
            }
        } else {
            createNewSession();
        }
    } catch (e) {
        console.error("Hiba a beszélgetések betöltésekor", e);
        createNewSession();
    }
}

async function fetchSessionDetails(sessionId) {
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/sessions/${studentId}/${sessionId}`);
        if (res.ok) {
            const data = await res.json();
            messages = data.messages || [];

            sessions = sessions.map(s => s.id === sessionId ? { ...s, title: data.title, updatedAt: data.updated_at } : s);
            renderSessions();
            renderMessages();
        }
    } catch (e) {
        console.error("Hiba a beszélgetés betöltésekor", e);
    }
}

async function createNewSession() {
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: studentId, task_id: taskId, title: "Új beszélgetés" })
        });
        if (res.ok) {
            const newSession = await res.json();
            const sessionToAdd = { id: newSession.id, title: newSession.title, updatedAt: newSession.updated_at };
            sessions.unshift(sessionToAdd);
            activeSessionId = newSession.id;

            if (window.innerWidth < 768) {
                isSidebarOpen = false;
                updateSidebarUI();
            }

            messages = [];
            renderSessions();
            renderMessages();
        }
    } catch (e) {
        console.error("Hiba a beszélgetés létrehozásakor", e);
    }
}

async function deleteSession(id) {
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/sessions/${id}`, { method: "DELETE" });
        if (res.ok) {
            sessions = sessions.filter(s => s.id !== id);
            if (activeSessionId === id) {
                if (sessions.length > 0) {
                    activeSessionId = sessions[0].id;
                    fetchSessionDetails(activeSessionId);
                } else {
                    activeSessionId = null;
                    messages = [];
                    createNewSession();
                }
            } else {
                renderSessions();
            }
        }
    } catch (e) {
        console.error("Hiba a beszélgetés törlésekor", e);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const inputValue = chatInput.value;
    if (!inputValue.trim() || !activeSessionId) return;

    const userMessage = { role: "user", content: inputValue };
    messages.push(userMessage);

    chatInput.value = "";
    chatInput.style.height = 'auto';
    chatSubmit.setAttribute('disabled', 'true');
    isThinking = true;
    renderMessages();

    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: userMessage.content, task_id: taskId, session_id: activeSessionId }),
        });

        if (!response.ok) throw new Error("Hiba történt a szerverrel való kommunikáció során");

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();
            const assistantMessage = {
                role: "assistant",
                content: data.message,
                isEvaluation: true,
                evaluationData: data,
            };
            messages.push(assistantMessage);
            isThinking = false;
            renderMessages();
            fetchSessionDetails(activeSessionId);
        } 
        else if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
            isThinking = false;
            messages.push({ role: "assistant", content: "" });
            renderMessages(); 

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentAssistantContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                currentAssistantContent += chunk;

                let actualMessage = currentAssistantContent;

                if (currentAssistantContent.includes("\n--EVAL-END--\n")) {
                    const parts = currentAssistantContent.split("\n--EVAL-END--\n");
                    const evalJson = parts[0];
                    actualMessage = parts.slice(1).join("\n--EVAL-END--\n");

                    const lastMsg = messages[messages.length - 1];
                    if (!lastMsg.isEvaluation) {
                        try {
                            const evalData = JSON.parse(evalJson);
                            lastMsg.isEvaluation = true;
                            lastMsg.evaluationData = evalData;
                            renderMessages();
                        } catch(e) {
                            console.error("Failed to parse eval block", e);
                        }
                    }
                }

                if (actualMessage.length > 0 || !currentAssistantContent.includes("\n--EVAL-END--\n")) {
                    updateLastMessageContent(actualMessage);
                }
            }
            fetchSessionDetails(activeSessionId);
        }
    } catch (error) {
        console.error(error);
        isThinking = false;
        renderMessages();
    }
}
