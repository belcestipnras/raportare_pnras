// Completează cu datele tale de la Supabase (Settings -> API)
const URL_PROIECT = 'https://aexjrbdgajurxzngfkpx.supabase.co'; 
const CHEIE_ANON = 'sb_publishable_KPV__0BA9z4EvRl5eqC0FQ_hmBLOLYv';

// Conectarea propriu-zisă
const supabaseClient = supabase.createClient(URL_PROIECT, CHEIE_ANON);

async function incarcaDatele() {
    // Luăm datele din tabelul numit 'proiect'
    const { data, error } = await supabaseClient
        .from('proiect')
        .select('*');

    const elementLista = document.getElementById('lista-proiecte');

    if (error) {
        elementLista.innerHTML = `<p style="color:red">Eroare: ${error.message}</p>`;
        return;
    }

    if (data && data.length > 0) {
        elementLista.innerHTML = ''; // Ștergem mesajul de încărcare
        
        data.forEach(proiect => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${proiect.nume_proiect}</h3>
                <small>Creat la: ${new Date(proiect.created_at).toLocaleDateString()}</small>
            `;
            elementLista.appendChild(card);
        });
    } else {
        elementLista.innerHTML = '<p>Nu am găsit niciun proiect în tabel.</p>';
    }
}

incarcaDatele();