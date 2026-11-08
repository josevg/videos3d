// src/js/ffmpeg/renderer.js

// Instância global do FFmpeg para não precisar recarregar a cada vídeo
let ffmpegInstance = null;

async function initFFmpeg() {
    if (ffmpegInstance) return ffmpegInstance;

    const { FFmpeg } = FFmpegWASM;
    const { toBlobURL } = FFmpegUtil;

    const ffmpeg = new FFmpeg();
    
    // Atualiza a interface enquanto carrega (a primeira vez pode demorar)
    const statusDiv = document.getElementById('statusProcesso');
    if (statusDiv) statusDiv.innerText = '⚙️ A descarregar e carregar o motor FFmpeg... (Aguarde)';

    // Usamos toBlobURL para evitar problemas de CORS e permitir cache
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

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
 * @param {Blob} videoBlob - O vídeo base (gerado pelo Three.js/Canvas)
 * @param {Blob} audioBlob - O áudio da narração (gerado pela API TTS)
 */
async function renderizarVideoFinal(videoBlob, audioBlob) {
    const statusDiv = document.getElementById('statusProcesso');

    try {
        const ffmpeg = await initFFmpeg();

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
        // Nota: Se o seu vídeo base for WebM (do MediaRecorder), precisamos converter para MP4 (libx264)
        await ffmpeg.exec([
            '-i', videoName,
            '-i', audioName,
            '-c:v', 'libx264', // Re-codifica o vídeo para garantir compatibilidade total com MP4
            '-c:a', 'aac',     // Codifica o áudio em AAC
            '-map', '0:v:0',   // Pega o vídeo da primeira entrada (input_video)
            '-map', '1:a:0',   // Pega o áudio da segunda entrada (input_audio)
            '-shortest',       // Termina o vídeo quando o áudio ou o vídeo terminar (o que for menor)
            '-y',              // Sobrescreve se o arquivo já existir
            outputName
        ]);

        if (statusDiv) statusDiv.innerText = '✅ Vídeo pronto! A preparar o download...';

        // 3. Lê o arquivo final gerado
        const data = await ffmpeg.readFile(outputName);
        
        // 4. Cria o link de download automático
        const videoUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `video_3d_${Date.now()}.mp4`; // Nome único com timestamp
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 5. LIMPEZA DE MEMÓRIA (Crucial para não travar o navegador)
        URL.revokeObjectURL(videoUrl);
        await ffmpeg.deleteFile(videoName);
        await ffmpeg.deleteFile(audioName);
        await ffmpeg.deleteFile(outputName);

        if (statusDiv) statusDiv.innerText = '🎉 Concluído com sucesso! Verifique os seus downloads.';

    } catch (error) {
        console.error("Erro na renderização:", error);
        if (statusDiv) statusDiv.innerText = '❌ Erro ao renderizar o vídeo. Verifique a consola (F12).';
    }
}