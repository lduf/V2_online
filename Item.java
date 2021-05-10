public class Item{
    public String name;
    private int attaque;
    private int vie;


    public Item(){
	}
    public Item(String name, int attaque, int vie){
        this.name= name;
        this.attaque= attaque;
        this.vie= vie;
    }
    public String toString(){
        return "Vous avez l'objet "+this.name+". \n  "+this.attaque+" point d'attaque\n "+this.vie+" point de vie \n \n";
    }
//GETERS
   public int GetAttaque(){
	   return this.attaque;
	}

	public int GetVie(){
	   return this.vie;
	}

}
