// src/js/ffmpeg/renderer.js

// Instância global do FFmpeg para não precisar recarregar a cada vídeo
let ffmpegInstance = null;

async function initFFmpeg() {
    if (ffmpegInstance) return ffmpegInstance;

    // Verifica se as bibliotecas do FFmpeg carregaram corretamente no HTML
    if (typeof FFmpegWASM === 'undefined' || typeof FFmpegUtil === 'undefined') {
        throw new Error("Bibliotecas do FFmpeg não encontradas. Verifique se os scripts estão no HTML.");
    }

    const { FFmpeg } = FFmpegWASM;
    const { toBlobURL } = FFmpegUtil;

    const ffmpeg = new FFmpeg();
    
    const statusDiv = document.getElementById('statusProcesso');
    if (statusDiv) statusDiv.innerText = '⚙️ A descarregar e carregar o motor FFmpeg... (Aguarde)';

    // ATENÇÃO: Usando 'core-st' (Single-Threaded) porque o GitHub Pages 
    // bloqueia a versão multi-thread por falta de cabeçalhos COOP/COEP.
    const baseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/umd';
    
    try {
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    } catch (error) {
        console.error("Erro ao carregar FFmpeg:", error);
        throw new Error("Falha ao carregar motor de vídeo. Verifique a sua internet.");
    }

    // Evento para mostrar os logs do FFmpeg no console (útil para depuração)
    ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
    });

    // Evento para atualizar a barra de progresso na tela
    ffmpeg.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        if (statusDiv && progressPercent > 0) {
            statusDiv.innerText = `🎬 A processar vídeo: ${progressPercent}%`;
        }
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
}

/**
 * Junta o vídeo e o áudio e faz o download automático
 */
async function renderizarVideoFinal(videoBlob, audioBlob) {
    const statusDiv = document.getElementById('statusProcesso');

    try {
        const ffmpeg = await initFFmpeg();
        
        // AQUI ESTAVA O ERRO: O fetchFile precisa ser importado dentro da função ou globalmente
        const { fetchFile } = FFmpegUtil; 

        if (statusDiv) statusDiv.innerText = '📦 A preparar ficheiros no navegador...';

        // Define as extensões corretas baseadas no tipo do Blob
        const videoExt = videoBlob.type.includes('webm') ? 'webm' : 'mp4';
        const audioExt = audioBlob.type.includes('wav') ? 'wav' : 'mp3';

        const videoName = `input_video.${videoExt}`;
        const audioName = `input_audio.${audioExt}`;
        const outputName = 'output_final.mp4';

        // 1. Escreve os arquivos no sistema de arquivos virtual do navegador
        await ffmpeg.writeFile(videoName, await fetchFile(videoBlob));
        await ffmpeg.writeFile(audioName, await fetchFile(audioBlob));

        if (statusDiv) statusDiv.innerText = '🎬 A renderizar o vídeo final...';

        // 2. Comando FFmpeg para juntar vídeo e áudio
        await ffmpeg.exec([
            '-i', videoName,
            '-i', audioName,
            '-c:v', 'libx264', // Re-codifica o vídeo para garantir compatibilidade total com MP4
            '-c:a', 'aac',     // Codifica o áudio em AAC
            '-map', '0:v:0',   // Pega o vídeo da primeira entrada
            '-map', '1:a:0',   // Pega o áudio da segunda entrada
            '-shortest',       // Termina quando o menor arquivo terminar
            '-y',              // Sobrescreve se existir
            outputName
        ]);

        if (statusDiv) statusDiv.innerText = '✅ Vídeo pronto! A preparar o download...';

        // 3. Lê o arquivo final gerado
        const data = await ffmpeg.readFile(outputName);
        
        // 4. Cria o link de download automático
        const videoUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `video_3d_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 5. LIMPEZA DE MEMÓRIA (Evita que o navegador trave)
        URL.revokeObjectURL(videoUrl);
        await ffmpeg.deleteFile(videoName);
        await ffmpeg.deleteFile(audioName);
        await ffmpeg.deleteFile(outputName);

        if (statusDiv) statusDiv.innerText = '🎉 Concluído com sucesso! Verifique os seus downloads.';

    } catch (error) {
        console.error("Erro na renderização:", error);
        if (statusDiv) statusDiv.innerText = `❌ Erro: ${error.message || 'Falha ao renderizar'}`;
    }
}