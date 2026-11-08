// src/js/gemini/rotator.js

// 1. Lista de modelos solicitada
const MODELOS_GEMINI = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.8-extended-thinking",
    "gemini-omni-flash"
];

// 2. Recupera as chaves salvas localmente no navegador (configuradas no app.html)
function obterChavesAPI() {
    const chaves = localStorage.getItem('gemini_api_keys');
    return chaves ? JSON.parse(chaves) : [];
}

// 3. Variáveis de controlo de rotação
let chaveAtualIndex = 0;
let modeloAtualIndex = 0;

function rodarChaveGemini(totalChaves) {
    chaveAtualIndex = (chaveAtualIndex + 1) % totalChaves;
}

// 4. Função principal atualizada
async function gerarTextoComGemini(prompt) {
    const GEMINI_KEYS = obterChavesAPI();

    // Verifica se o utilizador configurou alguma chave
    if (GEMINI_KEYS.length === 0) {
        throw new Error("Nenhuma chave de API configurada. Por favor, adicione no painel de configurações.");
    }

    let ultimoErro = null;

    // Loop 1: Tenta todos os modelos
    for (let i = 0; i < MODELOS_GEMINI.length; i++) {
        // Pega o modelo atual (usando o index rotativo)
        const modeloAtual = MODELOS_GEMINI[(modeloAtualIndex + i) % MODELOS_GEMINI.length];

        // Loop 2: Para cada modelo, tenta todas as chaves disponíveis
        for (let j = 0; j < GEMINI_KEYS.length; j++) {
            const apiKey = GEMINI_KEYS[(chaveAtualIndex + j) % GEMINI_KEYS.length];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloAtual}:generateContent?key=${apiKey}`;

            try {
                console.log(`Tentando modelo: ${modeloAtual} | Chave final: ...${apiKey.slice(-4)}`);
                
                const resposta = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (!resposta.ok) {
                    // Se falhar (ex: 429 Too Many Requests ou 404 Model Not Found)
                    rodarChaveGemini(GEMINI_KEYS.length); // Roda a chave para a próxima tentativa
                    throw new Error(`Erro HTTP: ${resposta.status}`);
                }

                const dados = await resposta.json();
                
                // Se a API retornar o texto com sucesso
                if (dados.candidates && dados.candidates[0].content.parts[0].text) {
                    // Atualiza os índices para que a próxima geração comece a partir deste ponto de sucesso
                    modeloAtualIndex = (modeloAtualIndex + i) % MODELOS_GEMINI.length;
                    chaveAtualIndex = (chaveAtualIndex + j) % GEMINI_KEYS.length;
                    
                    return dados.candidates[0].content.parts[0].text; 
                }

            } catch (erro) {
                console.warn(`Falha no modelo ${modeloAtual}:`, erro.message);
                ultimoErro = erro;
                // O loop continua para a próxima chave
            }
        }
        // Se todas as chaves falharem para este modelo, avança para o próximo modelo
        console.log(`Todas as chaves falharam para o modelo ${modeloAtual}. Alternando modelo...`);
    }

    // Se chegar aqui, testou todos os modelos com todas as chaves e falhou
    throw new Error(`Todos os modelos e chaves falharam. Último erro: ${ultimoErro?.message}`);
}