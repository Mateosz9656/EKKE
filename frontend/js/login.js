let currentLoginType = "tanar";

document.addEventListener("DOMContentLoaded", () => {

    setLoginType("tanar");

    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById("username").value;
        const passwordInput = document.getElementById("password").value;
        const errorDiv = document.getElementById("error-message");

        errorDiv.classList.add("hidden");
        errorDiv.textContent = "";

        try {
            const res = await fetch("http://localhost:8000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            if (!res.ok) {
                errorDiv.textContent = "Hibás felhasználónév vagy jelszó!";
                errorDiv.classList.remove("hidden");
                return;
            }

            const data = await res.json();

            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else if (data.role === "teacher") {
                window.location.href = "instructor.html";
            } else {
                window.location.href = "student.html";
            }
        } catch (err) {
            errorDiv.textContent = "Hálózati hiba történt.";
            errorDiv.classList.remove("hidden");
        }
    });
});

function setLoginType(type) {
    currentLoginType = type;

    const types = ["tanar", "diak", "admin"];
    types.forEach(t => {
        const btn = document.getElementById(`btn-${t}`);
        const iconBg = document.getElementById(`icon-bg-${t}`);
        const textTitle = document.getElementById(`text-title-${t}`);

        btn.className = "login-type-btn w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border bg-slate-800/50 border-slate-700/50 hover:bg-slate-800";
        iconBg.className = "p-2 rounded-lg bg-slate-700 text-slate-400";
        textTitle.className = "font-semibold text-slate-300";
    });

    const activeBtn = document.getElementById(`btn-${type}`);
    const activeIconBg = document.getElementById(`icon-bg-${type}`);
    const activeTextTitle = document.getElementById(`text-title-${type}`);

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const formTitle = document.getElementById("form-title");
    const usernameLabel = document.getElementById("username-label");
    const usernameIconContainer = document.getElementById("username").previousElementSibling;

    if (type === "tanar") {
        activeBtn.className = "login-type-btn w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
        activeIconBg.className = "p-2 rounded-lg bg-blue-500/20 text-blue-400";
        activeTextTitle.className = "font-semibold text-white";

        usernameInput.type = "email";
        usernameInput.placeholder = "pelda@uni-eszterhazy.hu";
        usernameInput.value = "oktato@uni-eszterhazy.hu";
        passwordInput.value = "password123";
        formTitle.textContent = "Oktatói Belépés";
        usernameLabel.textContent = "Email cím";
        usernameIconContainer.innerHTML = '<i data-lucide="mail" class="w-[18px] h-[18px]"></i>';

    } else if (type === "diak") {
        activeBtn.className = "login-type-btn w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
        activeIconBg.className = "p-2 rounded-lg bg-indigo-500/20 text-indigo-400";
        activeTextTitle.className = "font-semibold text-white";

        usernameInput.type = "text";
        usernameInput.placeholder = "NEPTUN123";
        usernameInput.value = "NEPTUN123";
        passwordInput.value = "password123";
        formTitle.textContent = "Hallgatói Belépés";
        usernameLabel.textContent = "Neptun kód";
        usernameIconContainer.innerHTML = '<i data-lucide="user" class="w-[18px] h-[18px]"></i>';

    } else if (type === "admin") {
        activeBtn.className = "login-type-btn w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border bg-red-600/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]";
        activeIconBg.className = "p-2 rounded-lg bg-red-500/20 text-red-400";
        activeTextTitle.className = "font-semibold text-white";

        usernameInput.type = "email";
        usernameInput.placeholder = "pelda@uni-eszterhazy.hu";
        usernameInput.value = "admin@uni-eszterhazy.hu";
        passwordInput.value = "admin123";
        formTitle.textContent = "Adminisztrátori Belépés";
        usernameLabel.textContent = "Email cím";
        usernameIconContainer.innerHTML = '<i data-lucide="mail" class="w-[18px] h-[18px]"></i>';
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}
