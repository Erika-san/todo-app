// リストの読み書き(サーバー専用)。どの関数も userId で絞り込み、他人のリストには触れない
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { pickListColor, type ListDTO } from "@/lib/list-types";
import type { CreateListInput, UpdateListInput } from "@/lib/validation/list";

// 結果: 成功 / 同じ名前がある / 見つからない(他人のリスト・存在しない ID)
export type ListResult = { list: ListDTO } | { error: "duplicate" } | { error: "not-found" };

// 中の未完了タスクの数も一緒に数える
const WITH_TODO_COUNT = { _count: { select: { tasks: { where: { status: "todo" } } } } } as const;

type ListWithCount = Prisma.ListGetPayload<{ include: typeof WITH_TODO_COUNT }>;

function toListDTO(list: ListWithCount): ListDTO {
  return {
    id: list.id,
    name: list.name,
    color: list.color ?? pickListColor([]),
    todoCount: list._count.tasks,
  };
}

// 一意制約(同じユーザー内で同じ名前)に引っかかったか
function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// 自分のリスト一覧(作った順)
export async function listLists(userId: string): Promise<ListDTO[]> {
  const lists = await getPrisma().list.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: WITH_TODO_COUNT,
  });
  return lists.map(toListDTO);
}

// そのリストがこのユーザーのものか(タスクを入れる・絞り込む前に確かめる)
export async function ownsList(userId: string, listId: string): Promise<boolean> {
  return (await getPrisma().list.count({ where: { id: listId, userId } })) > 0;
}

// 作成。色は、まだ使っていない色を自動で付ける
export async function createList(userId: string, input: CreateListInput): Promise<ListResult> {
  const prisma = getPrisma();
  const existing = await prisma.list.findMany({ where: { userId }, select: { name: true, color: true } });
  if (existing.some((l) => l.name === input.name)) return { error: "duplicate" };
  try {
    const list = await prisma.list.create({
      data: { userId, name: input.name, color: pickListColor(existing.map((l) => l.color)) },
      include: WITH_TODO_COUNT,
    });
    return { list: toListDTO(list) };
  } catch (error) {
    // 同時に同じ名前で作られたときは、DB の一意制約が止める
    if (isUniqueViolation(error)) return { error: "duplicate" };
    throw error;
  }
}

// 名前・色の変更(送られた項目だけ)
export async function updateList(userId: string, id: string, input: UpdateListInput): Promise<ListResult> {
  const prisma = getPrisma();
  if (input.name !== undefined) {
    const same = await prisma.list.count({ where: { userId, name: input.name, NOT: { id } } });
    if (same > 0) return { error: "duplicate" };
  }
  try {
    const { count } = await prisma.list.updateMany({ where: { id, userId }, data: input });
    if (count === 0) return { error: "not-found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "duplicate" };
    throw error;
  }
  const list = await prisma.list.findFirst({ where: { id, userId }, include: WITH_TODO_COUNT });
  return list ? { list: toListDTO(list) } : { error: "not-found" };
}

// 削除。中のタスクは DB の ON DELETE SET NULL で list_id が空(インボックス)になり、消えずに残る
export async function deleteList(userId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().list.deleteMany({ where: { id, userId } });
  return count > 0;
}
