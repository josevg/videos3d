const SUPABASE_URL = 'https://sippxqgbsyzticziyjyx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcHB4cWdic3l6dGljeml5anl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MTc0NjAsImV4cCI6MjEwOTQ5MzQ2MH0.Gxn0KETtjFk10CyZYT2HcpVgKjDc8lAzJbBz3GClMN0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verificarAcessoDoUtilizador() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session || sessionError) {
    window.location.href = '?page=login';
    return null;
  }

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !cliente) {
    console.error('Erro ao carregar dados do cliente.');
    return null;
  }

  const hoje = new Date();
  const dataVencimento = new Date(cliente.data_vencimento);

  if (hoje > dataVencimento || cliente.status === 'bloqueado') {
    alert('A sua assinatura expirou. Por favor, renove o acesso.');
    window.location.href = '?page=vendas';
    return null;
  }

  return cliente;
}
