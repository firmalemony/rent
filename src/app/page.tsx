"use client";

import { useEffect, useMemo, useState } from "react";
import GoogleAddressAutocomplete from "@/components/GoogleAddressAutocomplete";
import AuthButtons from "@/components/AuthButtons";
import { useSession, signIn } from "next-auth/react";

type PropertyParams = {
	layout: string;
	areaSqm: number | "";
	balcony: boolean;
	cellar: boolean;
	garage: boolean;
	condition: "new" | "renovated" | "original" | "";
	floor: number | "";
	elevator: boolean;
	furnished: boolean;
};

type SavedProperty = {
	id: string;
	address: string;
	coords?: { lat: number; lng: number };
	params: PropertyParams;
	createdAt: string;
};

export default function Home() {
	const { data: session } = useSession();
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [address, setAddress] = useState<string>("");
	const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
	const [params, setParams] = useState<PropertyParams>({
		layout: "",
		areaSqm: "",
		balcony: false,
		cellar: false,
		garage: false,
		condition: "",
		floor: "",
		elevator: false,
		furnished: false,
	});

	const [properties, setProperties] = useState<SavedProperty[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const fetchProperties = async () => {
		if (!session?.user) return;
		const res = await fetch("/api/properties");
		if (res.status === 401) return;
		const data = await res.json();
		setProperties(
			data.map((d: any) => ({
				id: d.id,
				address: d.address,
				coords: d.latitude && d.longitude ? { lat: d.latitude, lng: d.longitude } : undefined,
				params: {
					layout: d.layout,
					areaSqm: d.areaSqm,
					balcony: d.balcony,
					cellar: d.cellar,
					garage: d.garage,
					condition: d.condition as any,
					floor: d.floor ?? "",
					elevator: d.elevator,
					furnished: d.furnished,
				},
				createdAt: d.createdAt,
			}))
		);
		setSelectedId((prev) => prev || (data[0]?.id ?? null));
	};

	useEffect(() => {
		fetchProperties();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user?.id]);

	const canContinueFromStep1 = useMemo(() => address.trim().length > 5, [address]);
	const canSubmitStep2 = useMemo(() => {
		return (
			address.trim().length > 5 &&
			params.layout.trim().length > 0 &&
			typeof params.areaSqm === "number" &&
			params.areaSqm > 5
		);
	}, [address, params]);

	return (
		<div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
				<nav style={{ display: "flex", gap: 8 }}>
					<button
						type="button"
						onClick={() => {
							if (!session?.user) {
								signIn("google");
								return;
							}
							setStep(3);
						}}
						style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #333", background: "#333", color: "#fff", cursor: "pointer" }}
					>
						Výpis nemovitostí
					</button>
					<button
						type="button"
						onClick={() => setStep(1)}
						style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #333", background: "#333", color: "#fff", cursor: "pointer" }}
					>
						Přidej novou nemovitost
					</button>
				</nav>
				<AuthButtons />
			</div>
			<h1 style={{ marginBottom: 16 }}>Aktuální tržní nájemné pro váš byt</h1>

			{step === 1 && (
				<div style={{ display: "grid", gap: 16 }}>
					<GoogleAddressAutocomplete
						label="Adresa"
						placeholder="Začněte psát adresu…"
						onPlaceSelected={(p) => {
							setAddress(p.formattedAddress);
							setCoords(p.location);
						}}
					/>
					<div style={{ display: "flex", gap: 8 }}>
						<button
							disabled={!canContinueFromStep1}
							onClick={() => setStep(2)}
							style={{
								padding: "10px 14px",
								borderRadius: 8,
								background: canContinueFromStep1 ? "#111" : "#888",
								color: "#fff",
								border: "none",
								cursor: canContinueFromStep1 ? "pointer" : "not-allowed",
							}}
						>
							Pokračovat
						</button>
					</div>
				</div>
			)}

			{step === 2 && (
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						if (!canSubmitStep2) return;
						if (!session?.user) {
							signIn("google");
							return;
						}
						const res = await fetch("/api/properties", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ address, coords, params }),
						});
						if (!res.ok) {
							alert("Uložení selhalo");
							return;
						}
						await fetchProperties();
						setStep(3);
					}}
					style={{ display: "grid", gap: 12 }}
				>
					<div>
						<label style={{ display: "block", marginBottom: 6 }}>Adresa</label>
						<input
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="Adresa"
							style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
						/>
					</div>

					<div>
						<label style={{ display: "block", marginBottom: 6 }}>Dispozice</label>
						<input
							value={params.layout}
							onChange={(e) => setParams((p) => ({ ...p, layout: e.target.value }))}
							placeholder="např. 2+kk, 3+1"
							style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
						/>
					</div>

					<div>
						<label style={{ display: "block", marginBottom: 6 }}>Výmera (m²)</label>
						<input
							type="number"
							min={0}
							value={params.areaSqm}
							onChange={(e) =>
								setParams((p) => ({ ...p, areaSqm: e.target.value ? Number(e.target.value) : "" }))
							}
							placeholder="např. 65"
							style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
						/>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
						{["balkon", "sklep", "garáž", "výtah", "zařízený"].map((label, index) => {
							const key = ["balcony", "cellar", "garage", "elevator", "furnished"][index] as keyof PropertyParams;
							const checked = Boolean(params[key as keyof PropertyParams]);
							return (
								<label key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<input
										type="checkbox"
										checked={checked}
										onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.checked } as PropertyParams))}
									/>
									{label}
								</label>
							);
						})}
					</div>

					<div>
						<label style={{ display: "block", marginBottom: 6 }}>Stav</label>
						<select
							value={params.condition}
							onChange={(e) => setParams((p) => ({ ...p, condition: e.target.value as PropertyParams["condition"] }))}
							style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
						>
							<option value="">Vyberte…</option>
							<option value="new">Novostavba</option>
							<option value="renovated">Po rekonstrukci</option>
							<option value="original">Původní stav</option>
						</select>
					</div>

					<div>
						<label style={{ display: "block", marginBottom: 6 }}>Patro</label>
						<input
							type="number"
							min={0}
							value={params.floor}
							onChange={(e) => setParams((p) => ({ ...p, floor: e.target.value ? Number(e.target.value) : "" }))}
							placeholder="např. 3"
							style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
						/>
					</div>

					<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
						<button
							type="button"
							onClick={() => setStep(1)}
							style={{ padding: "10px 14px", borderRadius: 8, background: "#eee", border: "1px solid #ccc" }}
						>
							Zpět
						</button>
						<button
							type="submit"
							disabled={!canSubmitStep2}
							style={{
								padding: "10px 14px",
								borderRadius: 8,
								background: canSubmitStep2 ? "#111" : "#888",
								color: "#fff",
								border: "none",
								cursor: canSubmitStep2 ? "pointer" : "not-allowed",
							}}
						>
							{session?.user ? "Uložit a zobrazit" : "Přihlásit se a uložit"}
						</button>
					</div>
				</form>
			)}

			{step === 3 && (
				<div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, minHeight: 420 }}>
					<aside style={{ border: "1px solid #333", borderRadius: 8, padding: 12, background: "#333", color: "#fff" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
							<strong style={{ color: "#fff" }}>Nemovitosti</strong>
							<button
								onClick={() => setStep(1)}
								style={{ padding: "6px 8px", border: "1px solid #555", borderRadius: 6, background: "#444", color: "#fff" }}
							>
								Přidat
							</button>
						</div>
						<div style={{ display: "grid", gap: 6 }}>
							{properties.map((p) => (
								<button
									key={p.id}
									onClick={() => setSelectedId(p.id)}
									style={{
										textAlign: "left",
										padding: "8px 10px",
										borderRadius: 6,
										border: p.id === selectedId ? "1px solid #fff" : "1px solid #555",
										background: p.id === selectedId ? "#555" : "#444",
										color: "#fff",
										cursor: "pointer",
									}}
								>
									<div style={{ fontWeight: 500, fontSize: 14, color: "#fff" }}>{p.address}</div>
									<div style={{ fontSize: 12, color: "#ddd" }}>{p.params.layout} • {typeof p.params.areaSqm === "number" ? p.params.areaSqm : "-"} m²</div>
								</button>
							))}
							{properties.length === 0 && <div style={{ color: "#ddd", fontSize: 14 }}>Zatím žádné nemovitosti.</div>}
						</div>
					</aside>
					<section style={{ border: "1px solid #333", borderRadius: 8, padding: 16, background: "#333", color: "#fff" }}>
						{(() => {
							const current = properties.find((p) => p.id === selectedId) || null;
							if (!current) return <div>Vyberte nemovitost vlevo.</div>;
							const rec = Math.round((typeof current.params.areaSqm === "number" ? current.params.areaSqm : 50) * 300);
							return (
								<div style={{ display: "grid", gap: 12 }}>
									<h2 style={{ margin: 0, color: "#fff" }}>{current.address}</h2>
									<div style={{ fontSize: 14, color: "#fff" }}>
										{current.params.layout}, {typeof current.params.areaSqm === "number" ? current.params.areaSqm : "-"} m², patro {typeof current.params.floor === "number" ? current.params.floor : "-"}
									</div>
									<div style={{
										border: "1px dashed #666",
										padding: 16,
										borderRadius: 8,
										background: "#444",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}>
										<div>
											<div style={{ color: "#fff", fontSize: 13 }}>Doporučené nájemné (prototyp)</div>
											<div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{rec.toLocaleString("cs-CZ")} Kč/měs</div>
										</div>
										<button
											onClick={async () => {
												if (!selectedId) return;
												await fetch(`/api/properties/${selectedId}`, { method: "DELETE" });
												await fetchProperties();
												setSelectedId((prev) => (prev === selectedId ? null : prev));
											}}
											style={{ padding: "8px 10px", border: "1px solid #f88", color: "#fff", background: "#c33", borderRadius: 6 }}
										>
											Smazat
										</button>
									</div>
								</div>
							);
						})()}
					</section>
				</div>
			)}
		</div>
	);
}
