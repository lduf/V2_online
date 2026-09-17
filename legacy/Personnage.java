import java.util.*;
public class Personnage{

	// VARIABLE FINAL
	int BASIC_VIE = 1600; //1600/nbjoeur
	int BASIC_ATTAQUE = 20;
/*
Un personnage est défini par un nom, une main (de 5 sorts), un sac (3 items) ainsi qu'une attaque, et de la vie qui sont modulés par le tirage des items
*/
	private Hand hand = new Hand();
	public final int NB_MAX_SORT = hand.NB_MAX_SORT;
	private Bag bag = new Bag();
	private String name;
	private int attaque = BASIC_ATTAQUE;
	private int vie = BASIC_VIE;

//création du personnage
	public Personnage(String name, int NbJoueur){
		this.name=name;
		this.vie/=NbJoueur; //Plus on est de joueur, plus la partie est longue, donc on diminue la vie des persos => pb si trop de joueurs trop peu de vie
		this.attaque += this.bag.attaqueAffection();
		if(this.attaque >95){this.attaque-=15;}// Ici l'objectif est de réduire les écarts d'attaque en les persos
		if(this.attaque <12){this.attaque+=15;}// Ici l'objectif est de réduire les écarts d'attaque en les persos
		this.vie += this.bag.vieAffection();
	}

	//Attaque entre perso

	public void lancerSort(Personnage adversaire, int indiceSort){
		//On imagine qu'on a choisi le sort qu'on veut lancer. (Ce sort est dans notre main)
		// Quand on lance un sort :>
		// Si attaque -> l'adversaire perd les points d'attaques
		// Si soin -> On gagne les points de soin
		Sort sortUsed = hand.GetSortInfo(indiceSort); // Je récupère le sort choisi dans le play
		int oldAdversLife = adversaire.GetVie(); // Je récupère la vie actuelle de l'adversaire
		int lancerDe = (int)(Math.random()*(sortUsed.GetDe()+1));// Je lance un dé entre 1 et la valeur du dé du sort
		double coeffAttenuation = lancerDe/(double)sortUsed.GetDe();// coefficient permettant de calculer les dégats infligés par les sorts
		int coup = (int)(this.GetAttaque() + (sortUsed.GetDegat()*coeffAttenuation));
		int soigner = (int)(this.GetVie() + (sortUsed.GetSoin()*coeffAttenuation));

		adversaire.SetVie(oldAdversLife - coup);//On attaque l'adversaire donc on lui retire sa belle vie
		this.SetVie(soigner); // Je me soigne
		this.hand.ReplaceSort(indiceSort);// ReplaceSort vient du fichier Hand.java en gros je lui donne un indice et ça remplace par un autre sort aleatoire
		System.out.println("***************");
		System.out.println(this.GetName()+", tu utilises le sort : "+sortUsed.GetName());
		System.out.println("******************");
		System.out.println("Tu lances ton dé : ");
		System.out.println("\n Vous obtenez un lancé de "+lancerDe+" sur "+sortUsed.GetDe());
		System.out.println("Coeff : "+coeffAttenuation);
		System.out.println("");
		System.out.println("*************");
		System.out.println("Vous infligez "+coup+" dégats à "+adversaire.GetName());
    if (sortUsed.GetSoin()<0){
		System.out.println("Vous perdez "+(int)(-sortUsed.GetSoin()*coeffAttenuation)+" points de vie");
	}else{
		System.out.println("Vous récuperez "+(int)(sortUsed.GetSoin()*coeffAttenuation)+" points de vie");
	}
		System.out.println("***********");
		System.out.println("Voici votre nouvelle main\n");
		System.out.println(this.hand.toString());
	}

//ReplaceSort
public Sort[] ReplaceSort(int indiceSort, Personnage p){
	Sort[] defauss={this.hand.ReplaceSort(indiceSort), p.hand.ReplaceSort((int)(Math.random()*NB_MAX_SORT-1))};
	return defauss;
}
//toString
	  public String toString(){
        String desc = "Salut "+this.name+". \n Voici ta main : \n \n ";
        desc += this.hand.toString();
        desc += this.bag.toString();
         return desc;
    }

    //GETERS
    public String GetName(){
	   return this.name;
	}
    public int GetAttaque(){
	   return this.attaque;
	}
	public int GetVie(){
	   return this.vie;
	}
	public String GetHand(){
		String desc = "";
        desc += this.hand.toString();
         return desc;
	}
    public String GetBag(){
		String desc = "";
        desc += this.bag.toString();
         return desc;
	}

//SETER

	public void SetVie(int vie){
		this.vie = vie;
	}

	// Présentation Perso

	public void Presentation(){
		System.out.println("Salut "+this.name);
		System.out.println("J'ai configuré ton perso. \n Tu pourras consulter tes stats à tout moment dans le jeu. \n");
		System.out.println("********"+this.name+"********");
		System.out.println("• Vie : "+this.vie);
		System.out.println("• Attaque : "+ this.attaque);
		System.out.println("******** BAG ********");
		System.out.println(this.GetBag());
		System.out.println("******** HAND ********");
		System.out.println(this.GetHand());
		System.out.println("****************");

	}

}
