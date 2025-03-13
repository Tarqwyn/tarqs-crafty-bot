import './App.css';

function App() {
  return (
    <div className="container">
      <img 
        src="/Tarqy-bot.webp" 
        alt="Tarqwyn's Crafting Bot" 
        className="header-image" 
      />
      <div className="header">

        <h1>Tarqwyn's Crafting Bot</h1>
      </div>
  
      <p>Ever found yourself needing that perfect crafted piece of gear but unsure who in your guild can make it, at the quality you want?  
      Or maybe you’ve got the materials, but you're missing key reagents and need to know exactly what’s required to guarantee success?</p>

      <p>And once you’ve figured all that out, how do you even let your guildmate know an order is coming their way?</p>

      <p>Sure, you could manage all this in-game, but what if some of it could be streamlined through Discord while you're offline?</p>

      <p>That’s where this API and Discord bot come in. It bridges the gap between World of Warcraft crafting and guild coordination outside the game, making it easier than ever to:</p>
      
      <ul>
        <li>Find the right crafter in your guild based on the materials you have.</li>
        <li>Determine exactly what reagents you need for crafting success.</li>
        <li>Coordinate crafting orders with your guildmates directly on Discord.</li>
      </ul>

      <div className="coming-soon">
        <h3>Coming Soon:</h3>
        <p>This bot currently only works with my own guild and is in alpha testing. I expect to make it available to other guilds in the next 4-6 weeks.</p>
      </div>

      <a href="https://discordbotlist.com/bots/tarqscraftybot" className="cta" target="_blank" rel="noopener noreferrer">Learn More about Tarqwyn's Crafting Bot</a>
    </div>
  );
}

export default App;
