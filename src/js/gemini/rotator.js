const GEMINI_KEYS = [
  "SUA_CHAVE_API_GEMINI_1",
  "SUA_CHAVE_API_GEMINI_2"
];

let chaveAtualIndex = 0;

function obterChaveAtiva() {
  return GEMINI_KEYS[chaveAtualIndex];
}

function rodarChaveGemini() {
  chaveAtualIndex = (chaveAtualIndex + 1) % GEMINI_KEYS.length;
}

async function gerarTextoComGemini(prompt) {
  const modelo = "gemini-2.5-flash";
  const apiKey = obterChaveAtiva();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!resposta.ok) {
      rodarChaveGemini();
      throw new Error("Erro na resposta da API Gemini.");
    }

    const dados = await resposta.json();
    return dados.candidates[0].content.parts[0].text;
  } catch (erro) {
    console.error("Falha ao processar com Gemini:", erro);
    throw erro;
  }
}
