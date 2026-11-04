
// ========================================
// 1. CONFIGURAZIONE SUPABASE
// ========================================

const SUPABASE_URL = "https://rvrewqvmehgypeyjmici.supabase.co";
const SUPABASE_KEY = "sb_publishable_pemngi9YBihz-Xt7pUs9dA_NShiguEh";

const APP_URL = "https://demarcolorenzo11-beep.github.io/Daily-Budget/";

const DAILY_BUDGET = 10;

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// 2. ELEMENTI HTML
// ========================================

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitButton = document.getElementById("authSubmitButton");
const authMessage = document.getElementById("authMessage");
const authSubtitle = document.getElementById("authSubtitle");
const authSwitchText = document.getElementById("authSwitchText");
const authSwitchButton = document.getElementById("authSwitchButton");

const logoutButton = document.getElementById("logoutButton");
const userEmail = document.getElementById("userEmail");

const sidebar = document.getElementById("sidebar");

const menuButtons = document.querySelectorAll(".menu-button");
const sections = document.querySelectorAll(".app-section");

const amountInput = document.getElementById("amount");
const addExpenseButton = document.getElementById("addExpenseButton");

const incomeAmountInput = document.getElementById("incomeAmount");
const addIncomeButton = document.getElementById("addIncomeButton");

const expenseTableBody = document.getElementById("expenseTableBody");


// ========================================
// 3. VARIABILI
// ========================================

let currentUser = null;

let expenses = [];
let incomes = [];

let budgetStartDate = null;

let authMode = "login";

let realtimeChannel = null;

let legacyBudgetStartDate =
    localStorage.getItem("budgetStartDate");

let appStarting = false;


// Conserviamo temporaneamente i vecchi dati locali.

function readLegacyData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

let legacyExpenses = readLegacyData("expenses");
let legacyIncomes = readLegacyData("incomes");


// ========================================
// 4. DATE E FORMATO
// ========================================

function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatAmount(amount) {
    return Number(amount).toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR"
    });
}


function formatDate(date) {
    const parts = date.split("-");

    const day = Number(parts[2]);
    const month = Number(parts[1]);
    const year = parts[0].slice(-2);

    return `${day}/${month}/${year}`;
}


// ========================================
// 5. SCHERMATA ACCESSO E REGISTRAZIONE
// ========================================

authSwitchButton.addEventListener("click", function() {

    if (authMode === "login") {

        authMode = "signup";

        authSubtitle.textContent = "Crea il tuo account";
        authSubmitButton.textContent = "Registrati";

        authSwitchText.textContent = "Hai già un account?";
        authSwitchButton.textContent = "Accedi";

        authPassword.autocomplete = "new-password";

    } else {

        authMode = "login";

        authSubtitle.textContent = "Accedi al tuo account";
        authSubmitButton.textContent = "Accedi";

        authSwitchText.textContent = "Non hai un account?";
        authSwitchButton.textContent = "Registrati";

        authPassword.autocomplete = "current-password";

    }

    authMessage.textContent = "";
    authForm.reset();

});


function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;

    authMessage.style.color =
        isError ? "#ff7777" : "#7edba0";
}


authForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) return;

    authSubmitButton.disabled = true;
    showAuthMessage("Attendi...");

    try {

        if (authMode === "signup") {

            const { data, error } = await supabaseClient.auth.signUp({

                email: email,
                password: password,

                options: {
                    emailRedirectTo: APP_URL
                }

            });

            if (error) throw error;

            if (data.session) {

                showAuthMessage("Account creato correttamente!");

            } else {

                showAuthMessage(
                    "Registrazione completata! Controlla la tua email e clicca sul link di conferma."
                );

            }

            authForm.reset();

        } else {

            const { error } = await supabaseClient.auth.signInWithPassword({

                email: email,
                password: password

            });

            if (error) throw error;

        }

    } catch (error) {

        showAuthMessage(error.message, true);

    } finally {

        authSubmitButton.disabled = false;

    }

});


// ========================================
// 6. CARICAMENTO DATI DAL DATABASE
// ========================================

async function refreshTransactions() {

    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from("transactions")
        .select("id, user_id, type, amount, date")
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Errore caricamento:", error);
        throw error;
    }

    const transactions = data || [];

    expenses = transactions
        .filter(item => item.type === "expense")
        .map(item => ({
            id: item.id,
            amount: Number(item.amount),
            date: item.date
        }));

    incomes = transactions
        .filter(item => item.type === "income")
        .map(item => ({
            id: item.id,
            amount: Number(item.amount),
            date: item.date
        }));

    renderExpenses();
}


// ========================================
// 7. MIGRAZIONE VECCHI DATI
// ========================================

async function migrateOldData() {

    const oldTransactions = [

        ...legacyExpenses.map(item => ({
            user_id: currentUser.id,
            type: "expense",
            amount: Number(item.amount),
            date: item.date
        })),

        ...legacyIncomes.map(item => ({
            user_id: currentUser.id,
            type: "income",
            amount: Number(item.amount),
            date: item.date
        }))

    ].filter(item =>
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    );

    if (oldTransactions.length === 0) return;

    const confirmation = confirm(
        `Ho trovato ${oldTransactions.length} vecchie registrazioni su questo dispositivo.\n\n` +
        "Vuoi trasferirle nel tuo account?\n\n" +
        "ATTENZIONE: conferma soltanto se questi dati appartengono a te. " +
        "Se stai usando un dispositivo condiviso o un nuovo account, scegli Annulla."
    );

    if (!confirmation) return;

    const { error } = await supabaseClient
        .from("transactions")
        .insert(oldTransactions);

    if (error) {
        throw new Error(
            "Trasferimento dei vecchi dati non riuscito: " + error.message
        );
    }

    localStorage.removeItem("expenses");
    localStorage.removeItem("incomes");

    legacyExpenses = [];
    legacyIncomes = [];

    console.log("Migrazione completata!");
}


// ========================================
// 8. DATA INIZIO BUDGET
// ========================================

async function setupBudgetStartDate() {

    const dates = [
        ...expenses.map(item => item.date),
        ...incomes.map(item => item.date)
    ].sort();

    budgetStartDate =
        currentUser.user_metadata?.budget_start_date ||
        legacyBudgetStartDate ||
        dates[0] ||
        getToday();

    if (!currentUser.user_metadata?.budget_start_date) {

        const { data, error } = await supabaseClient.auth.updateUser({

            data: {
                budget_start_date: budgetStartDate
            }

        });

        if (error) {

            console.error("Errore salvataggio data iniziale:", error);

        } else if (data.user) {

            currentUser = data.user;
            legacyBudgetStartDate = null;

        }

    }

}


// ========================================
// 9. SINCRONIZZAZIONE AUTOMATICA
// ========================================

function startRealtime() {

    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    realtimeChannel = supabaseClient
        .channel("transactions-" + currentUser.id)

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "transactions",
                filter: "user_id=eq." + currentUser.id
            },
            async function() {

                try {
                    await refreshTransactions();
                } catch (error) {
                    console.error("Errore sincronizzazione:", error);
                }

            }
        )

        .subscribe();

}


// ========================================
// 10. AVVIO ACCOUNT
// ========================================

async function startApp(user) {

    if (appStarting) return;

    appStarting = true;
    currentUser = user;

    authScreen.hidden = true;
    appShell.hidden = false;

    userEmail.textContent = user.email || "";

    expenseTableBody.innerHTML = "";

    try {

        const { data, error } = await supabaseClient
            .from("transactions")
            .select("id, user_id, type, amount, date")
            .eq("user_id", user.id);

        if (error) throw error;

        const cloudIsEmpty = (data || []).length === 0;

        if (
            cloudIsEmpty &&
            (legacyExpenses.length > 0 || legacyIncomes.length > 0)
        ) {
            await migrateOldData();
        }

        await refreshTransactions();

        await setupBudgetStartDate();

        renderExpenses();

        startRealtime();

    } catch (error) {

        console.error(error);

        alert(
            "Non è stato possibile caricare i dati.\n\n" +
            error.message
        );

    } finally {

        appStarting = false;

    }

}


// ========================================
// 11. USCITA DALL'ACCOUNT
// ========================================

logoutButton.addEventListener("click", async function() {

    const confirmation = confirm(
        "Vuoi davvero uscire dal tuo account?"
    );

    if (!confirmation) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Errore durante l'uscita: " + error.message);
    }

});


// ========================================
// 12. GESTIONE SESSIONE
// ========================================

supabaseClient.auth.onAuthStateChange(function(event, session) {

    setTimeout(async function() {

        if (event === "SIGNED_OUT") {

            if (realtimeChannel) {
                await supabaseClient.removeChannel(realtimeChannel);
                realtimeChannel = null;
            }

            currentUser = null;

            expenses = [];
            incomes = [];

            budgetStartDate = null;

            expenseTableBody.innerHTML = "";

            appShell.hidden = true;
            authScreen.hidden = false;

            authForm.reset();
            showAuthMessage("");

            return;
        }

        if (
            (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
            session
        ) {

            if (
                currentUser &&
                currentUser.id === session.user.id
            ) {
                return;
            }

            await startApp(session.user);

        }

    }, 0);

});


// ========================================
// 13. SIDEBAR
// ========================================

function openSidebar() {
    sidebar.classList.add("open");
}

function closeSidebar() {
    sidebar.classList.remove("open");
}

document.addEventListener("mousemove", function(event) {

    if (appShell.hidden) return;

    if (event.clientX <= 80) {
        openSidebar();
    }

});

sidebar.addEventListener("mouseleave", closeSidebar);
sidebar.addEventListener("mouseenter", openSidebar);


// ========================================
// 14. SWIPE TELEFONO
// ========================================

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", function(event) {

    if (appShell.hidden) return;

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;

}, { passive: true });


document.addEventListener("touchend", function(event) {

    if (appShell.hidden) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const differenceX = touchEndX - touchStartX;
    const differenceY = touchEndY - touchStartY;

    if (Math.abs(differenceX) < Math.abs(differenceY)) return;

    if (touchStartX < 50 && differenceX > 35) {
        openSidebar();
    }

    if (sidebar.classList.contains("open") && differenceX < -50) {
        closeSidebar();
    }

});


// ========================================
// 15. CAMBIO SEZIONE
// ========================================

menuButtons.forEach(button => {

    button.addEventListener("click", function() {

        const target = button.dataset.section;

        sections.forEach(section => {
            section.classList.remove("active-section");
        });

        document.getElementById(target).classList.add("active-section");

        menuButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        closeSidebar();

    });

});


// ========================================
// 16. AGGIUNTA SPESA
// ========================================

async function addExpense() {

    if (!currentUser) return;

    const amount = Number(
        amountInput.value.replace(",", ".")
    );

    if (!Number.isFinite(amount) || amount <= 0) return;

    addExpenseButton.disabled = true;

    try {

        const { error } = await supabaseClient
            .from("transactions")
            .insert({

                user_id: currentUser.id,
                type: "expense",
                amount: amount,
                date: getToday()

            });

        if (error) throw error;

        amountInput.value = "";

        await refreshTransactions();

    } catch (error) {

        alert("Errore durante il salvataggio: " + error.message);

    } finally {

        addExpenseButton.disabled = false;

    }

}


// ========================================
// 17. AGGIUNTA ENTRATA
// ========================================

async function addIncome() {

    if (!currentUser) return;

    const amount = Number(
        incomeAmountInput.value.replace(",", ".")
    );

    if (!Number.isFinite(amount) || amount <= 0) return;

    addIncomeButton.disabled = true;

    try {

        const { error } = await supabaseClient
            .from("transactions")
            .insert({

                user_id: currentUser.id,
                type: "income",
                amount: amount,
                date: getToday()

            });

        if (error) throw error;

        incomeAmountInput.value = "";

        await refreshTransactions();

    } catch (error) {

        alert("Errore durante il salvataggio: " + error.message);

    } finally {

        addIncomeButton.disabled = false;

    }

}


// ========================================
// 18. MODIFICA TOTALE GIORNALIERO
// ========================================

async function editDailyExpense(date) {

    if (!currentUser) return;

    const dailyExpenses = expenses.filter(
        expense => expense.date === date
    );

    if (dailyExpenses.length === 0) return;

    const oldTotal = dailyExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const confirmation = confirm(
        `Vuoi modificare la spesa totale del ${formatDate(date)}?\n\nImporto attuale: ${formatAmount(oldTotal)}`
    );

    if (!confirmation) return;

    const newValue = prompt(
        "Inserisci il nuovo totale giornaliero:",
        oldTotal.toFixed(2)
    );

    if (newValue === null) return;

    const newTotal = Number(
        newValue.trim().replace(",", ".")
    );

    if (!Number.isFinite(newTotal) || newTotal < 0) {
        alert("Inserisci un importo valido.");
        return;
    }

    try {

        const ids = dailyExpenses.map(item => item.id);

        if (newTotal === 0) {

            const { error } = await supabaseClient
                .from("transactions")
                .delete()
                .eq("user_id", currentUser.id)
                .in("id", ids);

            if (error) throw error;

        } else {

            const { error: updateError } = await supabaseClient
                .from("transactions")
                .update({ amount: newTotal })
                .eq("user_id", currentUser.id)
                .eq("id", ids[0]);

            if (updateError) throw updateError;

            if (ids.length > 1) {

                const { error: deleteError } = await supabaseClient
                    .from("transactions")
                    .delete()
                    .eq("user_id", currentUser.id)
                    .in("id", ids.slice(1));

                if (deleteError) throw deleteError;

            }

        }

        await refreshTransactions();

    } catch (error) {

        alert("Errore durante la modifica: " + error.message);

    }

}


// ========================================
// 19. CALCOLO E VISUALIZZAZIONE
// ========================================

function renderExpenses() {

    if (!budgetStartDate) return;

    expenseTableBody.innerHTML = "";

    const dailyTotals = {};
    const dailyIncomes = {};

    expenses.forEach(expense => {

        dailyTotals[expense.date] =
            (dailyTotals[expense.date] || 0) + expense.amount;

    });

    incomes.forEach(income => {

        dailyIncomes[income.date] =
            (dailyIncomes[income.date] || 0) + income.amount;

    });

    // Calcolo budget cumulativo.

    const dailyBalances = {};

    let balance = 0;

    const current = new Date(budgetStartDate + "T12:00:00");
    const end = new Date(getToday() + "T12:00:00");

    while (current <= end) {

        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, "0");
        const day = String(current.getDate()).padStart(2, "0");

        const date = `${year}-${month}-${day}`;

        const spent = dailyTotals[date] || 0;
        const earned = dailyIncomes[date] || 0;

        balance += DAILY_BUDGET + earned - spent;

        dailyBalances[date] = balance;

        current.setDate(current.getDate() + 1);

    }

    // Creazione righe.

    const dates = Object.keys(dailyBalances).reverse();

    dates.forEach(date => {

        const spent = dailyTotals[date] || 0;
        const earned = dailyIncomes[date] || 0;

        // Riga spesa.

        const expenseRow = document.createElement("tr");

        const expenseDate = document.createElement("td");
        expenseDate.textContent = formatDate(date);

        const expenseAmount = document.createElement("td");
        expenseAmount.textContent = formatAmount(spent);

        if (spent > 0) {

            expenseAmount.classList.add("expense-cell");
            expenseAmount.title = "Clicca per modificare la spesa";

            expenseAmount.addEventListener("click", function() {
                editDailyExpense(date);
            });

        }

        const expenseBalance = document.createElement("td");
        expenseBalance.textContent = formatAmount(dailyBalances[date]);

        expenseBalance.style.color =
            dailyBalances[date] < 0 ? "#ff6b6b" : "#7edba0";

        expenseBalance.style.fontWeight = "600";

        expenseRow.appendChild(expenseDate);
        expenseRow.appendChild(expenseAmount);
        expenseRow.appendChild(expenseBalance);

        expenseTableBody.appendChild(expenseRow);

        // Riga entrata.

        if (earned > 0) {

            const incomeRow = document.createElement("tr");
            incomeRow.classList.add("income-row");

            const incomeDate = document.createElement("td");
            incomeDate.textContent = formatDate(date);

            const incomeAmount = document.createElement("td");
            incomeAmount.textContent = "+" + formatAmount(earned);

            const incomeBalance = document.createElement("td");
            incomeBalance.textContent = formatAmount(dailyBalances[date]);

            incomeRow.appendChild(incomeDate);
            incomeRow.appendChild(incomeAmount);
            incomeRow.appendChild(incomeBalance);

            expenseTableBody.appendChild(incomeRow);

        }

    });

}


// ========================================
// 20. PULSANTI
// ========================================

addExpenseButton.addEventListener("click", addExpense);
addIncomeButton.addEventListener("click", addIncome);


// ========================================
// 21. REGISTRAZIONE PWA
// ========================================

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("PWA attivata correttamente");
            })
            .catch(error => {
                console.error("Errore PWA:", error);
            });

    });

}
