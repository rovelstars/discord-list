export default function LogoNavbar(){
  return (
    <img src="/img/bot/logo.svg" loading="lazy" alt="Rovel Discord List logo" className="w-12 h-12"
    onMouseEnter={(e) => {
      e.currentTarget.src = "/img/bot/pet.gif";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.src = "/img/bot/logo.svg";
    }}
    />
  )
}