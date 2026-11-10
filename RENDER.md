# Hospedagem no Render

O serviço usa Docker e um disco persistente montado em `/var/data`. O plano Starter e o disco de 1 GB geram cobrança. Use apenas uma instância, pois os dados e as sessões são locais a ela. Alterações no disco não são preservadas se o disco for removido. Mantenha cópias privadas dos arquivos de dados.

O repositório público contém somente uma base vazia. A instalação inicial cria o banco vazio e quatro usuários usando `RH_BOOTSTRAP_PASSWORD`. Nunca coloque senhas, currículos, candidatos ou credenciais no GitHub. Antes de abrir o sistema para uso, entre na conta administrativa e abra `/Importar` para importar os arquivos privados `candidates.json` e `state.json`; confira a contagem. A importação só funciona enquanto a base inicial está vazia. Os usuários usam a senha definida no Render.

Após a migração, remova `RH_BOOTSTRAP_EMPTY` e `RH_BOOTSTRAP_PASSWORD` do ambiente. Não altere os registros DNS até o serviço novo estar testado. No Render, associe o domínio, atualize apenas os registros de site necessários no provedor DNS e valide o certificado. Preserve registros de e-mail (MX, SPF, DKIM e outros). O serviço anterior pode ser suspenso depois que a troca estiver conferida.

Para o Gmail na hospedagem, crie no Google Cloud uma credencial OAuth de **aplicativo da Web**, com `https://gestaorhconsultoria.com.br/oauth/gmail/callback` como URI de redirecionamento autorizado. Guarde o JSON em `/var/data/gmail-client.json` por transferência privada; ajuste `RH_GMAIL_ORIGIN` caso use outra origem durante o teste e cadastre sua URI também no Google. Reconecte o Gmail no painel. A credencial de computador e o token local anterior não substituem esta configuração. Links de Canva ou currículos sem texto podem precisar de conferência manual.

O acesso público por primeiro nome e telefone possui baixa segurança, pois essas informações podem ser conhecidas por terceiros. Antes de usar a consulta pública com dados reais, considere uma autenticação mais forte e revise os dados exibidos.
