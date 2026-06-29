"use client";

import { useEffect } from "react";

import { ensureStorageInitialized } from "@/lib/storage/migrate";

export function StorageInitializer() {
  useEffect(() => {
    void ensureStorageInitialized();
  }, []);

  return null;
}
