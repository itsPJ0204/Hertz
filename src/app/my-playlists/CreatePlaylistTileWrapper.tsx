"use client";

import { useRouter } from "next/navigation";
import { CreatePlaylistTile } from "./CreatePlaylistTile";

export function CreatePlaylistTileWrapper() {
    const router = useRouter();

    return <CreatePlaylistTile onCreated={() => router.refresh()} />;
}
