export default async function PublicTourViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
      <p>Public role-gated view for tour <code>{id}</code> coming soon.</p>
    </div>
  );
}
