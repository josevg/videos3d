const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_DO_SUPABASE';

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
