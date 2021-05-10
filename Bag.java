import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.Iterator;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
public class Bag{
		final int NB_MAX_ITEM =3; // On dit ici que maximum 3 items sont dans une main => avantage : programme modulable (le top du top serait de mettre ces infos dans un Json du type réglage du jeu avec un joli programme Paramétrer le jeu pour  modifier le Json)
		final int NB_ITEM = JsonSize("Items.json"); // nb d'item dans le json
	  public Item[] ListeItem  = new Item[NB_ITEM]; // déclaration du tableau contenant tout les items
    private Item[] bag = new Item[NB_MAX_ITEM]; //BAG => NB_MAX_ITEM items tirés au hasard parmi ListeItem
		private boolean UniqueItem[] = new boolean[NB_ITEM]; // création tableau pour savoir si on a deja l'objet sur le perso
//Création d'un bag
    public Bag(){
			setTab("Items.json", ListeItem);// on remplit ListeItem avec le Json
			for(int i=0; i<NB_MAX_ITEM; i++){
				int alea = (int)(Math.random()*(NB_ITEM));//Je tire un nombre aléatoire
				while(UniqueItem[alea]){//Si j'ai déjà un true ça veut dire que j'ai déjà cet item donc j'en retire un nouveau
					 alea = (int)(Math.random()*(NB_ITEM));
				}
					this.bag[i]=ListeItem[(int)(alea)];//Je remplis mon bag
					UniqueItem[alea]=true;
			}
    }

    public int attaqueAffection(){ // Permet de faire la somme algébrique des points d'attaques que portent les items. Permet de moduler l'attaque du perso
		int attq = 0;
		for(Item itm : this.bag) attq+=itm.GetAttaque();
		return attq;
	}

	public int vieAffection(){// Permet de faire la somme algébrique des points de vie que portent les items. Permet de moduler la vie du perso
		int life = 0;
		for(Item itm : this.bag) life+=itm.GetVie();
		return life;
	}

     public void Print(){
        for(Item itm : ListeItem) System.out.println(itm);
    }
     public String toString(){
		 String desc="";
        for(Item itm : this.bag) desc += itm.toString();
        return desc;
    }


		// Je joujou avec les Json
		private int JsonSize(String chem){
			int size = 0;
			JSONParser parser = new JSONParser();
			try {
					JSONArray a = (JSONArray) parser.parse(new FileReader(chem));
			 		size=  a.size();
			}catch (Exception e) {
			}
			finally{
				return size;
			}
		}

		private void setTab(String chem, Item[] tab){
			JSONParser parser = new JSONParser();
			try {
					JSONArray a = (JSONArray) parser.parse(new FileReader(chem));
					int i=0;
					for (Object o : a){
						JSONObject item = (JSONObject) o;
						String name = (String) item.get("name");
						int attaque = (int)(long)item.get("attaque");
						int vie = (int)(long)item.get("vie");
						tab[i]= new Item(name, attaque, vie);
						i++;
					}
				}
			catch (Exception e){
				System.out.println(e);
			}
		}
}
