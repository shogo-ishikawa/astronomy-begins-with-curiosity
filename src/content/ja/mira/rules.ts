import type { MiraMessageRecord } from "../../../domain/project";

export const INTRODUCTION =
  "はじめまして。私はMira、この研究を一緒に進める研究パートナーです。天文学の知識は必要ありません。わからない言葉はその場で確認しながら、何が不思議なのかを一緒に見つけていきましょう。";

const advice: Record<string, string> = {
  formation:
    "網目の形に注目したのですね。形が時間とともにどう変わるかを比べると、形成の道筋を考えられます。まず、左右でつながり方が違う場所を一つ探してみましょう。",
  timing:
    "変化の時期に注目したのですね。始めと終わりだけでなく、複数の[[snapshot|snapshot]]を比べる必要があります。まず、どの時点を挟めば変化を追えそうか考えてみましょう。",
  density:
    "物質の集まった場所に注目したのですね。高密度領域は、ガスが集まり天体形成が進みやすい重力場と関係します。ただし、[[dark-matter|暗黒物質]]だけの計算は星形成を直接扱いません。まず、計算から直接言える範囲を分けてみましょう。",
  gravity:
    "重力で説明できる範囲に注目したのですね。[[n-body|N体シミュレーション]]は重力による暗黒物質の運動を追えますが、ガス冷却、星形成、フィードバックは直接計算しません。まず、含まれる物理と含まれない物理を分けましょう。",
  unsure:
    "まだ決めなくても不利益はありません。図の左右で最も違って見える部分を一つ観察してみましょう。形、集まり方、空いた場所のどれが気になるでしょうか。",
};

export function miraAdvice(choiceId: string) {
  return advice[choiceId] ?? advice.unsure;
}

export function addMiraMessage(
  history: MiraMessageRecord[],
  ruleId: string,
  body: string,
  now = new Date(),
): MiraMessageRecord[] {
  if (history.some((item) => item.ruleId === ruleId)) return history;
  return [
    ...history,
    {
      messageId: `${ruleId}-${now.getTime()}`,
      ruleId,
      body,
      createdAt: now.toISOString(),
    },
  ];
}
