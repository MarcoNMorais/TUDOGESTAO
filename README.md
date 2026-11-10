# Gestão RH Consultoria

Sistema local de banco de talentos, seleções, empresas e avaliações de experiência.

Este repositório público contém o código e uma base vazia. Cadastros de candidatos, currículos, empresas, senhas e credenciais do Gmail devem permanecer em armazenamento privado e fora do Git.

## Iniciar no Windows

1. Instale Node.js.
2. Copie candidates.example.json para candidates.json. Para restaurar dados reais, use uma cópia privada e confiável do arquivo candidates.json e, quando necessário, de state.json e auth.json. Nunca publique esses arquivos.
3. Para uma instalação nova, no PowerShell defina a variável RH_BOOTSTRAP_PASSWORD para uma senha de pelo menos 12 caracteres e execute node provision-users.cjs. Os quatro usuários são Marco, Marilia, Tahilla e Artur. Apague a variável de ambiente após a configuração.
4. Execute Iniciar.cmd e mantenha o servidor aberto. Os links começam em http://localhost:3210/Login.

Para conectar o Gmail é necessário habilitar a API no Google Cloud, criar credenciais OAuth para aplicativo de computador, colocar o JSON em gmail-client.json e autorizar a conta no painel. Tokens e credenciais são ignorados pelo Git. A aplicação está configurada para a conta da Gestão RH. Na modalidade de testes do Google pode ser necessário reconectar a cada sete dias.

A extração de PDF usa Python com pypdf disponível no ambiente local; arquivos sem texto acessível e links do Canva podem exigir conferência. O sistema grava dados em arquivos locais: é necessário hospedar o servidor com armazenamento privado e persistente antes de acessar pela internet. GitHub não é um banco de dados nem publica automaticamente o serviço.

