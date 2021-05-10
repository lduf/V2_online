import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.Iterator;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
/*
Une main (hand ici) est définie par un tableau de NB_MAX_SORT sorts tirés aléatoirement dans ListeSort
*/
public class Hand{
		final public int NB_MAX_SORT =5; // On dit ici que maximum 5 sorts sont dans une main => avantage : programme modulable (le top du top serait de mettre ces infos dans un Json du type réglage du jeu avec un joli programme Paramétrer le jeu pour  modifier le Json)
		final public int NB_SORTS = JsonSize("Sorts.json");//Je récupère le nombre de sorts dans mon Json
    public Sort[] ListeSort  = new Sort[NB_SORTS];
    private Sort[] hand = new Sort[NB_MAX_SORT];


    public Hand(){
		setTab("Sorts.json", ListeSort);
		for(int i =0; i<NB_MAX_SORT; i++){
			this.hand[i]=ListeSort[(int)(Math.random()*(NB_SORTS))];
		}

    }
		// méthode pour récupérer les infos sur un sort de la main
		public Sort GetSortInfo(int indiceSort){
			return hand[indiceSort];
		}
		// méthode pour remplacer un sort de la main de manière aléatoire
		public Sort ReplaceSort(int indiceSort){
			Sort replace = ListeSort[(int)(Math.random()*(ListeSort.length))];
			this.hand[indiceSort]=replace;
			return replace;
		}
		// Je ne sais même plus à quoi Print sert (oupsi)
     public void Print(){
        for(Sort srt : ListeSort) System.out.println(srt);
    }
	//toString
     public String toString(){
		 		String desc="";
		 		int o =1;
        for(Sort srt : this.hand){ desc += "["+o+"] : "+srt.toString(); o++;}
        return desc;
    }
//JsonSize pour récupérer le nombre de sorts dans la liste globale située dans le json
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
//setTab permet de créer un tableau de Sort à partir de mon Json (franchement assez fier de cette méthode même si internet m'a bien aidé)
	private void setTab(String chem, Sort[] tab){

		JSONParser parser = new JSONParser();
		try {
				  JSONArray a = (JSONArray) parser.parse(new FileReader(chem));
					int i=0;
				for (Object o : a){
						JSONObject sort = (JSONObject) o;
						String name = (String) sort.get("name");
						int degat = (int)(long)sort.get("degat");
						int soin = (int)(long)sort.get("soin");
						int de = (int)(long)sort.get("de");
						tab[i]= new Sort(name, degat, soin, de);
						i++;
		  	}
			}
		catch (Exception e){
			//System.out.println(e);
		}
	}
}
