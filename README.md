# Checklist do Apartamento — V3

Versão modularizada do gerenciador original.

## Estrutura

- `index.html` — estrutura da interface
- `css/styles.css` — estilos e responsividade
- `js/data.js` — configurações, status e lista padrão
- `js/app.js` — regras de negócio, persistência e renderização
- `gerenciador_apartamento_tela_inicial.html` — versão anterior preservada como referência

## Melhorias da V3

- correção do filtro de status;
- filtro por classificação;
- cálculo de **pago** baseado nas parcelas efetivamente pagas;
- cálculo de **a pagar** separado de comprometido;
- migração automática do LocalStorage V2 para V3;
- importação de backup com validações adicionais;
- datas locais sem dependência de UTC;
- parcelamento mensal seguro para datas no fim do mês;
- checkbox de conclusão restaura o status anterior ao desmarcar;
- garantia em meses com cálculo automático do vencimento;
- aviso de garantias vencendo em até 90 dias;
- comparação Planejado x Real com barras independentes;
- interface em cards para celular;
- classificação destacada nos itens;
- labels e atributos básicos de acessibilidade;
- links externos exibidos somente quando válidos.

## Dados

Os dados continuam locais no navegador e o backup JSON continua recomendado. A V3 procura automaticamente dados salvos na chave da V2 e os migra para a nova estrutura.
