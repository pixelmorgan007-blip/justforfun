let incomes = [];
        let expenses = [];

        function addIncome() {
            const source = document.getElementById('incomeSource').value;
            const amount = parseFloat(document.getElementById('incomeAmount').value);
            if (source && amount) {
                incomes.push({ source, amount });
                document.getElementById('incomeSource').value = '';
                document.getElementById('incomeAmount').value = '';
                renderIncomeList();
            }
        }

        function addExpense() {
            const source = document.getElementById('expenseSource').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const qty = parseInt(document.getElementById('expenseQty').value) || 1;
            if (source && amount) {
                expenses.push({ source, amount, qty });
                document.getElementById('expenseSource').value = '';
                document.getElementById('expenseAmount').value = '';
                document.getElementById('expenseQty').value = 1;
                renderExpenseList();
            }
        }

        function renderIncomeList() {
            const div = document.getElementById('incomeList');
            div.innerHTML = '<b>Incomes:</b><ul>' + incomes.map(i => `<li>${i.source}: NRS ${i.amount.toFixed(2)}</li>`).join('') + '</ul>';
        }

        function renderExpenseList() {
            const div = document.getElementById('expenseList');
            div.innerHTML = '<b>Expenses:</b><ul>' +
                expenses.map(e => `<li>${e.source}: NRS ${e.amount.toFixed(2)} × ${e.qty} = NRS ${(e.amount * e.qty).toFixed(2)}</li>`).join('') +
                '</ul>';
        }

        function renderStatement(totalIncome, totalExpense, balance, isCurrentMonth = true) {
            const color = isCurrentMonth ? '#d4edda' : '#f8d7da';
            const border = isCurrentMonth ? '2px solid #28a745' : '2px solid #dc3545';
            document.getElementById('statement').innerHTML =
                `<div style="background:${color};padding:18px 20px;border-radius:8px;max-width:350px;
                font-size:1.1em;box-shadow:0 2px 8px #0001;border:${border};margin-bottom:10px;">
                    <b>Total Income:</b> <span style="color:#155724;">NRS ${totalIncome.toFixed(2)}</span><br>
                    <b>Total Expense:</b> <span style="color:#721c24;">NRS ${totalExpense.toFixed(2)}</span><br>
                    <b>Balance:</b> <span style="color:${balance >= 0 ? '#155724' : '#721c24'};">NRS ${balance.toFixed(2)}</span>
                </div>`;
        }

        function updateHistory() {
            const history = JSON.parse(localStorage.getItem('monthlyHistory') || '[]');
            const tbody = document.querySelector('#historyTable tbody');
            const currentMonth = document.getElementById('month').value;
            tbody.innerHTML = history.map(h =>
                `<tr style="background:${h.month === currentMonth ? '#d4edda' : '#f8d7da'}">
                    <td>${h.month}</td>
                    <td>NRS ${h.totalIncome.toFixed(2)}</td>
                    <td>NRS ${h.totalExpense.toFixed(2)}</td>
                    <td>NRS ${h.balance.toFixed(2)}</td>
                </tr>`
            ).join('');
        }

        function getCurrentStatementText() {
            const statementDiv = document.getElementById('statement');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = statementDiv.innerHTML;
            return tempDiv.innerText.trim();
        }

        function downloadPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const month = document.getElementById('month').value || 'Statement';
            doc.setFontSize(16);
            doc.text(`Monthly Statement: ${month}`, 10, 15);
            doc.setFontSize(12);
            const lines = getCurrentStatementText().split('\n');
            let y = 30;
            lines.forEach(line => {
                doc.text(line.trim(), 10, y);
                y += 10;
            });
            doc.save(`Statement_${month}.pdf`);
        }

        function sendStatementEmail() {
            const month = document.getElementById('month').value || '';
            const statementText = getCurrentStatementText();

            if (!window.emailjs) {
                alert('EmailJS is not loaded. Please check your internet connection and the script include.');
                return;
            }

            if (!month || !statementText) {
                alert('Please choose a month and save the statement before sending email.');
                return;
            }

            const serviceId = 'YOUR_SERVICE_ID';
            const templateId = 'YOUR_TEMPLATE_ID';
            const templateParams = {
                to_email: 'recipient@example.com',
                subject: `Monthly Statement: ${month}`,
                message: statementText,
                statement_month: month
            };

            emailjs.send(serviceId, templateId, templateParams)
                .then(function (response) {
                    alert('✅ Email sent successfully!');
                }, function (error) {
                    console.error('❌ Email send failed:', error);
                    alert('Failed to send email. Please check the service/template IDs and your EmailJS setup.');
                });
        }

        document.getElementById('recordForm').onsubmit = function (e) {
            e.preventDefault();
            const month = document.getElementById('month').value;
            if (!month) return;
            const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
            const totalExpense = expenses.reduce((sum, e) => sum + (e.amount * e.qty), 0);
            const balance = totalIncome - totalExpense;
            renderStatement(totalIncome, totalExpense, balance, true);

            let history = JSON.parse(localStorage.getItem('monthlyHistory') || '[]');
            history = history.filter(h => h.month !== month);
            history.push({ month, totalIncome, totalExpense, balance });
            localStorage.setItem('monthlyHistory', JSON.stringify(history));
            updateHistory();

            incomes = [];
            expenses = [];
            renderIncomeList();
            renderExpenseList();
        };

        updateHistory();

        document.getElementById('month').addEventListener('change', function () {
            updateHistory();
            const month = this.value;
            const history = JSON.parse(localStorage.getItem('monthlyHistory') || '[]');
            const record = history.find(h => h.month === month);
            if (record) {
                renderStatement(record.totalIncome, record.totalExpense, record.balance, true);
            } else {
                document.getElementById('statement').innerHTML = '';
            }
        });

        document.getElementById('clearHistoryBtn').onclick = function () {
            if (confirm('Are you sure you want to clear all history?')) {
                localStorage.removeItem('monthlyHistory');
                updateHistory();
                document.getElementById('statement').innerHTML = '';
                incomes = [];
                expenses = [];
                renderIncomeList();
                renderExpenseList();
            }
        };