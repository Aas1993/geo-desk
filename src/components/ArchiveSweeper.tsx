"use client";
import { useEffect } from "react";
import { startSweeper } from "@/lib/archive-sweep";
/** Mounted once in the shell: keeps the Archive up to date with the products saved in this browser. Renders nothing. */
export function ArchiveSweeper() { useEffect(() => startSweeper(), []); return null; }
