
// ================================
// IMPOSTAZIONI
// ================================

const DAILY_BUDGET = 10;


// ================================
// ELEMENTI HTML
// ================================

const sidebar = document.getElementById("sidebar");

const menuButtons = document.querySelectorAll(".menu-button");
const sections = document.querySelectorAll(".app-section");

const amountInput = document.getElementById("amount");
const addExpenseButton = document.getElementById("addExpenseButton");

const incomeAmountInput = document.getElementById("incomeAmount");
const addIncomeButton = document.getElementById("addIncomeButton");

const expenseTableBody = document.getElementById("expenseTableBody");


// ================================
// SIDEBAR
// ================================

function openSidebar() {
    sidebar.classList.add("open");
}

function closeSidebar() {
    sidebar.classList.remove("open");
}

document.addEventListener("mousemove", function(event) {
    if (event.clientX <= 80) {
        openSidebar();
    }
});

sidebar.addEventListener("mouseleave", closeSidebar);
sidebar.addEventListener("mouseenter", openSidebar);


// ================================
// SWIPE TELEFONO
// ================================

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", function(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", function(event) {

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


// ================================
// CAMBIO SEZIONE
// ================================

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


// ================================
// DATA ODIERNA
// ================================

function getToday() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ================================
// CARICAMENTO DATI
// ================================

let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

expenses = expenses.map(expense => ({
    id: expense.id || (Date.now() + Math.random()),
    amount: Number(expense.amount),
    date: expense.date
}));

let incomes = JSON.parse(localStorage.getItem("incomes")) || [];

incomes = incomes.map(income => ({
    id: income.id || (Date.now() + Math.random()),
    amount: Number(income.amount),
    date: income.date
}));

function saveExpenses() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

function saveIncomes() {
    localStorage.setItem("incomes", JSON.stringify(incomes));
}


// ================================
// INIZIO BUDGET
// ================================

const existingStartDate = localStorage.getItem("budgetStartDate");

const allDates = [
    ...expenses.map(expense => expense.date),
    ...incomes.map(income => income.date)
].filter(date => date <= getToday());

const firstActivityDate = allDates.sort()[0];

const budgetStartDate =
    existingStartDate ||
    firstActivityDate ||
    getToday();

localStorage.setItem("budgetStartDate", budgetStartDate);


// ================================
// FORMATTAZIONE
// ================================

function formatAmount(amount) {

    return amount.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR"
    });

}

function formatDate(date) {

    const parts = date.split("-");

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


// ================================
// AGGIUNTA SPESA
// ================================

function addExpense() {

    const amount = Number(amountInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return;
    }

    expenses.push({
        id: Date.now() + Math.random(),
        amount: amount,
        date: getToday()
    });

    saveExpenses();

    amountInput.value = "";

    renderExpenses();

}


// ================================
// AGGIUNTA ENTRATA
// ================================

function addIncome() {

    const amount = Number(incomeAmountInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return;
    }

    incomes.push({
        id: Date.now() + Math.random(),
        amount: amount,
        date: getToday()
    });

    saveIncomes();

    incomeAmountInput.value = "";

    renderExpenses();

}


// ================================
// MODIFICA TOTALE GIORNALIERO
// ================================

function editDailyExpense(date) {

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

    expenses = expenses.filter(
        expense => expense.date !== date
    );

    if (newTotal > 0) {
        expenses.push({
            id: Date.now() + Math.random(),
            amount: newTotal,
            date: date
        });
    }

    saveExpenses();

    renderExpenses();

}


// ================================
// CALCOLO E VISUALIZZAZIONE
// ================================



function renderExpenses() {

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

    // Calcolo budget cumulativo
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

    // Creazione righe
    const dates = Object.keys(dailyBalances).reverse();

    dates.forEach(date => {

        const spent = dailyTotals[date] || 0;
        const earned = dailyIncomes[date] || 0;

        // Riga spesa
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

        // Riga entrata
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


// ================================
// AVVIO APP
// ================================

saveExpenses();
saveIncomes();

addExpenseButton.addEventListener("click", addExpense);
addIncomeButton.addEventListener("click", addIncome);

renderExpenses();
