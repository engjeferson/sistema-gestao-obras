// Formatação progressiva (conforme o usuário digita) pra CPF/CNPJ e
// telefone — decide o formato pela quantidade de dígitos já digitados,
// não por um tipo escolhido à parte.
export function formatDocumento(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    let out = p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `.${p3}`;
    if (p4) out += `-${p4}`;
    return out;
  }
  // CNPJ: 00.000.000/0000-00
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out;
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;
  // 11 dígitos = celular (9 na frente), 10 = fixo — o formato muda ao
  // digitar o 11º dígito, comportamento padrão de máscara de telefone BR.
  const isCelular = digits.length > 10;
  const middleEnd = isCelular ? 7 : 6;
  const middle = digits.slice(2, middleEnd);
  const end = digits.slice(middleEnd, 11);
  return end ? `(${ddd}) ${middle}-${end}` : `(${ddd}) ${middle}`;
}
