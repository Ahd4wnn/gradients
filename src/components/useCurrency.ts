"use client";
import { useSyncExternalStore } from "react";
import { guessCurrency, isCurrency, type Currency } from "@/lib/pricing";

const KEY = "gf.currency";
const EVENT = "gf-currency";

function read(): Currency {
  try {
    const v = localStorage.getItem(KEY);
    if (isCurrency(v)) return v;
  } catch {
    /* storage blocked: fall back to the guess */
  }
  return guessCurrency();
}

const subscribe = (fn: () => void) => {
  addEventListener(EVENT, fn);
  addEventListener("storage", fn);
  return () => {
    removeEventListener(EVENT, fn);
    removeEventListener("storage", fn);
  };
};

/**
 * The visitor's currency: their own choice if they made one (remembered, so pricing and checkout agree), otherwise a
 * guess from their time zone. Null during server rendering, where the time zone is unknown.
 */
export function useCurrency(): [Currency | null, (c: Currency) => void] {
  const currency = useSyncExternalStore(subscribe, read, () => null);
  const set = (c: Currency) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* not remembered, still applied below */
    }
    dispatchEvent(new Event(EVENT));
  };
  return [currency, set];
}
