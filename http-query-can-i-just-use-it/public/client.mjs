const formEl = document.querySelector('form');
const outputEl = document.querySelector('pre');
const categoryEl = document.querySelector('#category');
const priceEl = document.querySelector('#price');

formEl.addEventListener('submit', async event => {
 event.preventDefault();
 
 try {
     const response = await fetch('/products/search', { 
        method: 'QUERY', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({
            category: categoryEl.value,
            maxPrice: Number(priceEl.value)}) 
        });
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
    outputEl.textContent = JSON.stringify(await response.json(),null,2);
 } catch(error) { 
    outputEl.textContent=error.message;
 }

});
