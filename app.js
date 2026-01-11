// ÎNLOCUIEȘTE CU DATELE TALE DIN SUPABASE
const SUPABASE_URL = 'https://xyz.supabase.co'; 
const SUPABASE_KEY = 'cheia_ta_anon_aici';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Funcția care aduce datele din tabelul 'proiect'
async function incarcaDatele() {
    const { data, error } = await supabaseClient
        .from('proiect')
        .select('*')
        .order('created_at', { ascending: false });

    const elementLista = document.getElementById('lista-proiecte');
    
    if (error) {
        elementLista.innerHTML = `<p style="color:red">Eroare: ${error.message}</p>`;
        return;
    }

    elementLista.innerHTML = ''; 
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${item.nume_proiect}</h3>
            <small>Creat la: ${new Date(item.created_at).toLocaleDateString()}</small>
        `;
        elementLista.appendChild(card);
    });
}

// Funcția care salvează un proiect nou
async function adaugaProiect() {
    const input = document.getElementById('nume-nou');
    const nume = input.value.trim();

    if (!nume) return alert("Introdu un nume!");

    const { error } = await supabaseClient
        .from('proiect')
        .insert([{ nume_proiect: nume }]);

    if (error) {
        alert("Eroare: " + error.message);
    } else {
        input.value = '';
        incarcaDatele();
    }
}

// Ascultăm evenimentul de click
document.getElementById('btn-adauga').addEventListener('click', adaugaProiect);

// Încărcăm datele la prima vizită
incarcaDatele();