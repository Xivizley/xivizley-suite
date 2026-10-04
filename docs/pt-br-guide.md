# Guia Oficial XIVIZLEY Suite — Português do Brasil (pt-BR)

Bem-vindo ao guia de implantação da **XIVIZLEY Suite** para a comunidade brasileira de Homelab, administradores de sistemas e provedores de VDS/VPS.

---

## 🇧🇷 O que é a XIVIZLEY Suite?

A XIVIZLEY Suite é uma plataforma aberta de infraestrutura em nuvem privada e auto-hospedada (self-hosted), projetada com a linguagem visual amigável do **Nextcloud Hub**, unindo em um único painel:

1. **Hub & Single Sign-On (SSO):** Autenticação centralizada com tokens criptográficos assimétricos RS256 e sessões isoladas.
2. **Drive & Armazenamento:** Gerenciador de arquivos completo com suporte a visualização rápida (Quick Look) para PDFs, fotos, vídeos e código.
3. **Pass (Cofre de Senhas & 2FA):** Gerenciador de credenciais com medidor de entropia em tempo real, gerador de senhas seguras e códigos TOTP com anel regressivo animado.
4. **Pulse & Sentinela VDS:** Monitoramento contínuo de recursos de hardware (CPU, memória RAM, disco NVMe) e saúde de contêineres Docker, com alertas automáticos via Telegram.
5. **Cockpit de Jogos:** Painel de controle de alto desempenho para servidores dedicados (Minecraft Spigot/Paper e FiveM FXServer) com backups em um clique e catálogo de mods.
6. **Loja de 115 Aplicativos:** Catálogo pré-configurado de contêineres Docker para homelab (mídia, automação residencial, VPN, monitoramento, bancos de dados e inteligência artificial local).

---

## 💻 Requisitos Mínimos do Sistema

Para executar a suite com excelente desempenho em um VDS ou máquina física:

| Componente | Requisito Mínimo | Recomendado para Produção |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU (x86_64 ou ARM64) | 4 vCPU |
| **Memória RAM** | 2 GB (com swap) | 4 GB a 8 GB |
| **Armazenamento** | 20 GB SSD/NVMe livre | 50 GB+ NVMe |
| **Sistema Operacional** | Ubuntu 22.04/24.04 LTS ou Debian 12 | Ubuntu 24.04 LTS |
| **Docker Engine** | v24.0+ e Docker Compose v2+ | v26.0+ com Compose v2.27+ |
| **Portas de Rede** | 80/tcp (HTTP) e 443/tcp (HTTPS) | 80, 443, 22/tcp (SSH) |

---

## ⚡ Instalação Rápida (1 Comando)

### Opção A: Script Automatizado via cURL
Em seu servidor Linux recém-instalado, execute como usuário `root` ou com privilégios `sudo`:

```bash
curl -fsSL https://suite.xivizley.com.tr/install.sh | bash
```

O script detectará as portas disponíveis, configurará o Caddy com emissão automática de certificados SSL gratuitos (Let's Encrypt), inicializará o banco de dados PostgreSQL 16 isolado e subirá todos os serviços.

### Opção B: Assistente Interativo via CLI (`npx xivizley`)
Se você já possui Node.js instalado no servidor:

```bash
npx xivizley suite
```

O assistente interativo guiará você na definição do seu domínio (ex: `suite.seuhomelab.com.br`) ou IP público e criará o arquivo `docker-compose.yml` otimizado.

---

## 🔒 Modo Demonstração & Segurança em Produção

A XIVIZLEY Suite conta com uma camada rigorosa de proteção denominada **Global Demo Mutation Guard**:
- **Visitantes / Avaliação:** Usuários podem explorar todas as telas pelo botão *"Canlı Demo Olarak Keşfet"* (Explorar Demonstração ao Vivo).
- **Proteção 403 Forbidden:** Qualquer requisição de alteração de dados (`POST`, `PUT`, `PATCH`, `DELETE`) feita por sessões convidadas é sumariamente bloqueada com o código `DEMO_READ_ONLY`.
- **Isolamento de Dados:** Dados administrativos privados nunca são expostos; a API entrega apenas registros seguros de exemplo para contas de demonstração.

---

## 🛡️ Rotina de Backup e Recuperação de Desastres

A suite já inclui scripts prontos para backup sem bloqueio de escrita:

### 1. Gerando um Backup Manual
```bash
cd /opt/xivizley-suite
./scripts/backup-daily.sh
```
O arquivo compactado será salvo em `/var/backups/xivizley/db_AAAAMMDD_HHMMSS.sql.gz`. O script exclui automaticamente arquivos com mais de 7 dias para economizar espaço em disco.

### 2. Configurando Execução Automática (Crontab)
Para rodar todos os dias às 03:00 da madrugada:
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/xivizley-suite/scripts/backup-daily.sh >/dev/null 2>&1") | crontab -
```

### 3. Restaurando um Backup
```bash
./scripts/restore.sh /var/backups/xivizley/db_20261004_015720.sql.gz
```

---

## 📦 Gerenciamento de Serviços

```bash
# Verificar status dos contêineres
docker compose ps

# Visualizar logs em tempo real
docker compose logs -f sso

# Reiniciar a suite
docker compose restart

# Atualizar para a versão mais recente
git pull origin main
docker compose build --pull
docker compose up -d
```

---

## 🤝 Suporte Técnico & Parcerias no Brasil

- **Arquiteto & Desenvolvedor:** Alperen Celal (14 anos, Bursa)
- **E-mail de Suporte:** `destek@xivizley.com.tr`
- **Plataforma Web:** [xivizley.com.tr](https://xivizley.com.tr)
- **Código Aberto:** [github.com/Xivizley/xivizley-suite](https://github.com/Xivizley/xivizley-suite)
- **Licença:** MIT — Livre para uso pessoal, homelab e distribuição em provedores de VDS.
