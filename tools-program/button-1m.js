// Add button to add 1,000,000€ to balance
window.addEventListener('DOMContentLoaded', () => {
  const balanceBox = document.getElementById('balanceBox');
  if (balanceBox) {
    const addBtn = document.createElement('button');
    addBtn.textContent = '+1M€';
    addBtn.style.marginLeft = '12px';
    addBtn.onclick = function() {
      let balance = loadBalance();
      balance += 1000000;
      saveBalance(balance);
      document.getElementById('balance').textContent = balance.toFixed(2);
    };
    balanceBox.appendChild(addBtn);
  }
});